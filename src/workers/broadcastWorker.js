import connectDB from '../lib/db.js';
import Broadcast from '../models/Broadcast.js';
import Contact from '../models/Contact.js';
import Company from '../models/Company.js';
import Conversation from '../models/Conversation.js';
import CampaignRecipient from '../models/CampaignRecipient.js';
import { resolveWhatsAppCredentials, sendMetaTemplate } from '../lib/metaWhatsAppService.js';
import { resolveRecipientVariable, createClickRecord, finaliseBroadcast } from '../lib/broadcastSchedulerService.js';
import { saveOutboundMessage } from '../lib/outboundMessageService.js';
import { createKafkaConsumer, isKafkaEnabled, fallbackBus } from '../lib/kafkaClient.js';
import { publishKafkaJob, KAFKA_TOPICS } from '../lib/kafkaProducer.js';

const WORKER_ID = process.env.WORKER_ID || `worker-proc-${process.pid}`;
const BATCH_SIZE = parseInt(process.env.KAFKA_CONCURRENCY || '10', 10);
const THROTTLE_MS = parseInt(process.env.KAFKA_THROTTLE_MS || '50', 10);
const MAX_RETRIES = parseInt(process.env.KAFKA_MAX_RETRIES || '3', 10);
const STALE_LOCK_TIMEOUT_MS = parseInt(process.env.KAFKA_STALE_LOCK_TIMEOUT_MS || '300000', 10); // 5 minutes

/**
 * Process a single Broadcast Campaign job.
 */
export async function processBroadcastJob(payload) {
  const { broadcastId, companyId, actor, traceId } = payload;

  console.log('[BROADCAST_WORKER_TRACE]', {
    stage: 'JOB_RECEIVED',
    broadcastId,
    companyId,
    traceId,
    workerId: WORKER_ID,
  });

  await connectDB();

  const broadcast = await Broadcast.findById(broadcastId);
  if (!broadcast) {
    console.error('[BROADCAST_WORKER_TRACE] Broadcast document not found:', broadcastId);
    return { success: false, reason: 'BROADCAST_NOT_FOUND' };
  }

  // If campaign is already COMPLETED or CANCELLED, stop processing
  if (['COMPLETED', 'CANCELLED'].includes(broadcast.status)) {
    console.log('[BROADCAST_WORKER_TRACE] Campaign already completed or cancelled, skipping:', broadcast.status);
    return { success: true, status: broadcast.status };
  }

  const company = await Company.findById(companyId || broadcast.companyId);
  if (!company || company.status !== 'active') {
    throw new Error(`Company ${companyId} not found or inactive`);
  }

  const { resolvedPhoneNumberId, resolvedWabaId, resolvedAccessToken } = resolveWhatsAppCredentials({ company });
  const phoneNumberId = resolvedPhoneNumberId;
  const accessToken = resolvedAccessToken;
  const wabaId = resolvedWabaId;

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp Business Account credentials missing or invalid for company');
  }

  // Build target audience query
  const query = {
    companyId: company._id,
    status: { $nin: ['blocked', 'unsubscribed', 'archived'] },
  };

  if (broadcast.targetType === 'group' && broadcast.targetValue) {
    query.groups = { $regex: new RegExp(`^${broadcast.targetValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
  } else if (broadcast.targetType === 'tag' && broadcast.targetValue) {
    query.tags = { $regex: new RegExp(`^${broadcast.targetValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
  }

  const targetContacts = await Contact.find(query);

  if (targetContacts.length === 0) {
    console.warn('[BROADCAST_WORKER_TRACE] No contactable target contacts found for broadcast:', broadcastId);
    await finaliseBroadcast(broadcast, { sent: 0, failed: 0, total: 0 });
    return { success: true, sent: 0, failed: 0, total: 0 };
  }

  let sent = 0;
  let failed = 0;
  const staleCutoff = new Date(Date.now() - STALE_LOCK_TIMEOUT_MS);

  // Process contacts in controlled batches
  for (let i = 0; i < targetContacts.length; i += BATCH_SIZE) {
    const batch = targetContacts.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (contact) => {
        const cleanPhone = contact.phone.replace(/[^0-9]/g, '');
        const idempotencyKey = `${broadcast._id}_${contact._id}`;

        // ── 1. Check existing recipient record for prior delivery ──────────────
        const existingRecipient = await CampaignRecipient.findOne({ idempotencyKey });

        if (existingRecipient) {
          if (existingRecipient.status === 'sent' || existingRecipient.status === 'delivered' || existingRecipient.status === 'read') {
            console.log('[BROADCAST_WORKER_TRACE] Recipient already sent, skipping (Idempotency Guard):', idempotencyKey);
            sent++;
            return;
          }

          // Rule 6 Safety Check: If Meta wamid is present, Meta already accepted it
          if (existingRecipient.metaMessageId && existingRecipient.metaMessageId.startsWith('wamid')) {
            console.log('[BROADCAST_WORKER_TRACE] Recipient has wamid, marking sent without re-dispatch:', idempotencyKey);
            existingRecipient.status = 'sent';
            await existingRecipient.save();
            sent++;
            return;
          }

          // Rule 6 Safety Check: If status is SENDING and lock is NOT stale, another active worker owns it
          if (existingRecipient.status === 'sending' && existingRecipient.sendingLockedAt > staleCutoff) {
            console.log('[BROADCAST_WORKER_TRACE] Recipient locked by active worker, skipping:', idempotencyKey);
            return;
          }
        }

        // ── 2. Atomic Lock Claim: PENDING -> SENDING ────────────────────────────
        let recipient = null;
        try {
          recipient = await CampaignRecipient.findOneAndUpdate(
            {
              broadcastId: broadcast._id,
              contactId: contact._id,
              $or: [
                { status: { $in: ['pending', 'queued'] } },
                { status: 'sending', sendingLockedAt: { $lte: staleCutoff }, metaMessageId: { $in: [null, ''] } },
                { status: { $exists: false } },
              ],
            },
            {
              $set: {
                companyId: company._id,
                phone: cleanPhone,
                idempotencyKey,
                status: 'sending',
                sendingLockedAt: new Date(),
                workerId: WORKER_ID,
              },
              $inc: { attemptCount: 1 },
            },
            { upsert: true, new: true }
          );
        } catch (lockErr) {
          // If mongo unique constraint caught concurrent insertion, skip
          console.warn('[BROADCAST_WORKER_TRACE] Concurrent lock acquisition skipped:', lockErr.message);
          return;
        }

        if (!recipient || recipient.status !== 'sending' || recipient.workerId !== WORKER_ID) {
          console.log('[BROADCAST_WORKER_TRACE] Could not claim sending lock, skipping recipient:', contact._id);
          return;
        }

        // ── 3. Dispatch to Meta Cloud API ──────────────────────────────────────
        try {
          // Find or create conversation thread
          let conversation = await Conversation.findOne({ companyId: company._id, customerPhone: cleanPhone });
          if (!conversation) {
            conversation = await Conversation.create({
              companyId: company._id,
              waId: cleanPhone,
              customerPhone: cleanPhone,
              customerName: contact.name,
              phoneNumberId,
              wabaId,
              status: 'active',
            });
          } else if (!conversation.phoneNumberId) {
            conversation.phoneNumberId = phoneNumberId;
            if (wabaId && !conversation.wabaId) conversation.wabaId = wabaId;
            await conversation.save();
          }

          // Build Meta template parameters
          const metaComponents = [];
          if (broadcast.variables && Array.isArray(broadcast.variables) && broadcast.variables.length > 0) {
            const bodyParameters = broadcast.variables.map((val) => {
              let textVal = resolveRecipientVariable(val, contact);
              if (!textVal || textVal.trim() === '') textVal = '-';
              return { type: 'text', text: textVal };
            });
            metaComponents.push({ type: 'body', parameters: bodyParameters });
          }

          if (broadcast.headerMediaUrl) {
            metaComponents.push({
              type: 'header',
              parameters: [{ type: 'image', image: { link: broadcast.headerMediaUrl } }],
            });
          }

          const metaResult = await sendMetaTemplate({
            phoneNumberId,
            accessToken,
            to: cleanPhone,
            templateName: broadcast.templateName,
            languageCode: broadcast.languageCode,
            components: metaComponents,
            companyId: company._id.toString(),
            conversationId: conversation._id.toString(),
            wabaId,
          });

          const wamid = metaResult?.messages?.[0]?.id || `wamid.bcast.${Date.now()}`;

          // Persist outbound message in inbox
          await saveOutboundMessage({
            companyId: company._id,
            conversationId: conversation._id,
            contactId: contact._id,
            phoneNumberId,
            wabaId,
            waId: cleanPhone,
            senderType: 'system',
            sender: {
              id: actor?._id || null,
              name: actor?.name || 'Kafka Worker',
              type: 'system',
            },
            messageType: 'template',
            body: `[Broadcast Campaign: ${broadcast.name}]`,
            templateName: broadcast.templateName,
            wamid,
            metaMessageId: wamid,
            status: 'sent',
          });

          // Create click tracking pre-record
          const destinationUrl = broadcast.buttons?.[0]?.url || process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';
          const trackingId = await createClickRecord({
            broadcastId: broadcast._id,
            companyId: company._id,
            contactId: contact._id,
            phone: cleanPhone,
            destinationUrl,
          });

          // ── 4. Post-Send State Persistence: Transition to SENT ────────────────
          recipient.status = 'sent';
          recipient.metaMessageId = wamid;
          recipient.sentAt = new Date();
          recipient.trackingId = trackingId;
          recipient.errorMessage = '';
          await recipient.save();

          sent++;
        } catch (sendErr) {
          console.error(`[BROADCAST_WORKER_TRACE] Meta send failure for ${cleanPhone}:`, sendErr.message);

          // Transition to FAILED
          recipient.status = 'failed';
          recipient.errorMessage = sendErr.message;
          await recipient.save();

          failed++;
        }
      })
    );

    // Controlled throttling between batch chunks
    if (THROTTLE_MS > 0 && i + BATCH_SIZE < targetContacts.length) {
      await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
    }
  }

  // ── 5. Finalize Campaign Stats & Rates ────────────────────────────────────
  await finaliseBroadcast(broadcast, { sent, failed, total: targetContacts.length });

  console.log('[BROADCAST_WORKER_TRACE]', {
    stage: 'JOB_COMPLETED',
    broadcastId: broadcast._id,
    sent,
    failed,
    total: targetContacts.length,
  });

  return { success: true, sent, failed, total: targetContacts.length };
}

/**
 * Start Kafka Worker Consumer (or attach fallback listener)
 */
export async function startBroadcastWorker() {
  console.log('[BROADCAST_WORKER_TRACE] Initializing Broadcast Worker process:', WORKER_ID);

  // 1. In-process fallback event listener
  fallbackBus.on(KAFKA_TOPICS.BROADCASTS, async (payload) => {
    try {
      await processBroadcastJob(payload);
    } catch (err) {
      console.error('[BROADCAST_WORKER_TRACE] Fallback worker error:', err.message);
    }
  });

  // 2. Kafka Consumer setup if Kafka is enabled
  if (isKafkaEnabled) {
    const consumer = await createKafkaConsumer(
      process.env.KAFKA_CONSUMER_GROUP || process.env.KAFKA_GROUP_ID || 'syncchat-broadcast-workers'
    );
    if (!consumer) return;

    try {
      await consumer.connect();
      await consumer.subscribe({ topic: KAFKA_TOPICS.BROADCASTS, fromBeginning: false });

      console.log('[BROADCAST_WORKER_TRACE] Kafka Consumer connected & subscribed to:', KAFKA_TOPICS.BROADCASTS);

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const rawVal = message.value.toString();
            const payload = JSON.parse(rawVal);

            await processBroadcastJob(payload);
          } catch (jobErr) {
            console.error('[BROADCAST_WORKER_TRACE] Kafka message processing error:', jobErr.message);

            // Attempt DLQ routing if max retries exceeded
            try {
              const rawVal = message.value.toString();
              const payload = JSON.parse(rawVal);
              await publishKafkaJob(KAFKA_TOPICS.BROADCASTS_DLQ, {
                ...payload,
                error: jobErr.message,
                failedAtWorker: WORKER_ID,
              });
            } catch (dlqErr) {
              console.error('[BROADCAST_WORKER_TRACE] Failed to publish to DLQ:', dlqErr.message);
            }
          }
        },
      });

      // Graceful shutdown handling
      const shutdown = async () => {
        console.log('[BROADCAST_WORKER_TRACE] Shutting down Kafka consumer gracefully...');
        try {
          await consumer.disconnect();
        } catch (e) {}
        process.exit(0);
      };

      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    } catch (err) {
      console.error('[BROADCAST_WORKER_TRACE] Kafka Consumer initialization error:', err.message);
    }
  }
}
