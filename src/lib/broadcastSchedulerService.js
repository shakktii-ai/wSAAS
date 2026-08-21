/**
 * broadcastSchedulerService.js
 *
 * Shared broadcast execution logic used by:
 *  1. The manual "Dispatch" button  →  broadcastController.executeBroadcast
 *  2. The automated cron runner     →  /api/cron/broadcast-scheduler
 *
 * Duplicate-execution prevention
 * ──────────────────────────────
 * The cron uses an atomic MongoDB findOneAndUpdate that sets `lockedAt` only
 * when `lockedAt` is currently null.  Two concurrent cron invocations racing
 * on the same campaign will both attempt:
 *
 *   findOneAndUpdate(
 *     { status: 'SCHEDULED', scheduledAt: { $lte: now }, lockedAt: null },
 *     { $set: { status: 'PROCESSING', lockedAt: now } }
 *   )
 *
 * Only ONE will match (the first to acquire the lock); the second will receive
 * null and skip the campaign.
 *
 * Click Tracking URL generation
 * ──────────────────────────────
 * generateTrackingId()  →  creates a CampaignClick document with a unique
 *                           trackingId and the real destination URL.
 * buildTrackingUrl()    →  builds  <APP_URL>/api/track/click/<trackingId>
 */

import connectDB from '@/lib/db';
import Broadcast from '@/models/Broadcast';
import Contact from '@/models/Contact';
import Conversation from '@/models/Conversation';
import CampaignRecipient from '@/models/CampaignRecipient';
import CampaignClick from '@/models/CampaignClick';
import Company from '@/models/Company';
import { sendMetaTemplate, resolveWhatsAppCredentials } from '@/lib/metaWhatsAppService';
import { saveOutboundMessage } from '@/lib/outboundMessageService';
import crypto from 'crypto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolves a template variable mapping token for a recipient contact.
 * Supports:
 *  - Contact built-in fields: {{name}}, {{phone}}, {{email}}, {{company}}, {{designation}}, {{city}}, {{state}}, {{country}}, {{leadScore}}
 *  - Contact custom fields / Service Request fields: {{custom.serviceRequestId}}, {{custom.technicianName}}, {{custom.serviceDate}}, {{custom.status}}, {{custom.pincode}}, {{custom.address}}, {{custom.details}}, {{custom.category}}, or custom key names
 *  - Static values: Any fixed text string (e.g. "OFFER2026")
 */
export function resolveRecipientVariable(val, contact) {
  if (val === null || val === undefined) return '-';
  const tokenStr = String(val).trim();
  if (!tokenStr) return '-';

  const lowerToken = tokenStr.toLowerCase();

  // 1. Built-in Contact fields
  if (lowerToken === '{{name}}' || lowerToken === 'name') {
    return contact.name || 'Customer';
  }
  if (lowerToken === '{{phone}}' || lowerToken === 'phone') {
    return contact.phone || '';
  }
  if (lowerToken === '{{email}}' || lowerToken === 'email') {
    return contact.email || '';
  }
  if (lowerToken === '{{company}}' || lowerToken === '{{companyname}}' || lowerToken === 'company' || lowerToken === 'companyname') {
    return contact.companyName || '';
  }
  if (lowerToken === '{{designation}}' || lowerToken === 'designation') {
    return contact.designation || '';
  }
  if (lowerToken === '{{city}}' || lowerToken === 'city') {
    return contact.city || '';
  }
  if (lowerToken === '{{state}}' || lowerToken === 'state') {
    return contact.state || '';
  }
  if (lowerToken === '{{country}}' || lowerToken === 'country') {
    return contact.country || '';
  }
  if (lowerToken === '{{leadscore}}' || lowerToken === 'leadscore') {
    return contact.leadScore !== undefined && contact.leadScore !== null ? String(contact.leadScore) : '';
  }
  if (lowerToken === '{{language}}' || lowerToken === 'language') {
    return contact.language || '';
  }

  // 2. Custom Contact fields & Service Request fields
  let customKey = '';
  const customMatch = tokenStr.match(/^\{\{\s*custom\.(.*?)\s*\}\}$/i) || tokenStr.match(/^custom\.(.*)$/i);
  if (customMatch) {
    customKey = customMatch[1].trim();
  } else if (tokenStr.startsWith('{{') && tokenStr.endsWith('}}')) {
    customKey = tokenStr.replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '').trim();
  } else {
    customKey = tokenStr;
  }

  if (contact.customFields && customKey) {
    const snakeKey = customKey.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    const camelKey = customKey.replace(/_([a-z])/g, (_, g) => g.toUpperCase());

    let customVal = null;
    if (typeof contact.customFields.get === 'function') {
      customVal =
        contact.customFields.get(customKey) ||
        contact.customFields.get(customKey.toLowerCase()) ||
        contact.customFields.get(snakeKey) ||
        contact.customFields.get(camelKey);
    } else if (typeof contact.customFields === 'object') {
      customVal =
        contact.customFields[customKey] ||
        contact.customFields[customKey.toLowerCase()] ||
        contact.customFields[snakeKey] ||
        contact.customFields[camelKey];
    }

    if (customVal !== null && customVal !== undefined && String(customVal).trim() !== '') {
      return String(customVal).trim();
    }
  }

  // 3. Fallback if placeholder tag {{custom.X}} was used but value was missing
  if (tokenStr.startsWith('{{') && tokenStr.endsWith('}}')) {
    return '-';
  }

  // 4. Static value string
  return tokenStr;
}

/**
 * Generate a short URL-safe tracking ID (18 chars).
 * Uses crypto.randomBytes for collision safety.
 */
function generateTrackingId() {
  return crypto.randomBytes(12).toString('base64url');
}

/**
 * Build the public redirect URL that is embedded in messages.
 */
export function buildTrackingUrl(trackingId) {
  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  return `${base}/api/track/click/${trackingId}`;
}

/**
 * Create a CampaignClick pre-record (before any click happens).
 * Returns the trackingId so it can be stored on the CampaignRecipient.
 */
export async function createClickRecord({ broadcastId, companyId, contactId, phone, destinationUrl }) {
  const trackingId = generateTrackingId();
  await CampaignClick.create({
    trackingId,
    broadcastId,
    companyId,
    contactId: contactId || null,
    phone: phone || '',
    destinationUrl,
    // clickedAt / isUnique remain null until an actual click occurs
  });
  return trackingId;
}

// ─── Core Execution ───────────────────────────────────────────────────────────

/**
 * executeBroadcastCore
 *
 * Sends the broadcast to all matching contacts.
 * Called by both the manual dispatch controller and the cron scheduler.
 *
 * @param {Object} broadcast  - Mongoose Broadcast document (already in PROCESSING state)
 * @param {Object} company    - Mongoose Company document
 * @param {Object} [actor]    - { _id, name } — the user who triggered this (null for cron)
 * @returns {{ sent, failed, total }}
 */
export async function executeBroadcastCore(broadcast, company, actor = null) {
  await connectDB();

  const { resolvedPhoneNumberId, resolvedWabaId, resolvedAccessToken } = resolveWhatsAppCredentials({ company });

  const phoneNumberId = resolvedPhoneNumberId;
  const accessToken   = resolvedAccessToken;
  const wabaId        = resolvedWabaId;

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp Business Account is not connected');
  }

  // ── Build audience query ──────────────────────────────────────────────────
  // Exclude blocked / unsubscribed / archived contacts.
  // We intentionally do NOT restrict to status==='active' only,
  // because freshly-created contacts default to 'active' but the
  // contacts UI may show them with a different label.
  const query = {
    companyId: company._id,
    status: { $nin: ['blocked', 'unsubscribed', 'archived'] },
  };

  if (broadcast.targetType === 'group' && broadcast.targetValue) {
    // Case-insensitive group match
    query.groups = { $regex: new RegExp(`^${broadcast.targetValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
  } else if (broadcast.targetType === 'tag' && broadcast.targetValue) {
    // Case-insensitive tag match — handles LEAD / Lead / lead all equally
    query.tags = { $regex: new RegExp(`^${broadcast.targetValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
  }

  const targetContacts = await Contact.find(query);

  if (targetContacts.length === 0) {
    const targetDesc = broadcast.targetType === 'all'
      ? 'all contacts'
      : `${broadcast.targetType} "${broadcast.targetValue}"`;
    throw new Error(`No contactable contacts found for ${targetDesc}. Check the tag/group name and make sure contacts are not blocked or unsubscribed.`);
  }

  let sent   = 0;
  let failed = 0;

  // ── Send to each contact ──────────────────────────────────────────────────
  for (const contact of targetContacts) {
    // Throttle: 50 ms between sends to respect Meta rate limits
    if (sent + failed > 0) {
      await new Promise((r) => setTimeout(r, 50));
    }

    try {
      const cleanPhone = contact.phone.replace(/[^0-9]/g, '');

      // Find or create conversation
      let conversation = await Conversation.findOne({ companyId: company._id, customerPhone: cleanPhone });
      if (!conversation) {
        conversation = await Conversation.create({
          companyId:    company._id,
          waId:         cleanPhone,
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

      // ── Build Meta components array for template parameters ───────────────
      const metaComponents = [];

      if (broadcast.variables && Array.isArray(broadcast.variables) && broadcast.variables.length > 0) {
        const bodyParameters = broadcast.variables.map((val) => {
          let textVal = resolveRecipientVariable(val, contact);

          if (!textVal || textVal.trim() === '') {
            textVal = '-';
          }

          return {
            type: 'text',
            text: textVal,
          };
        });

        metaComponents.push({
          type: 'body',
          parameters: bodyParameters,
        });
      }

      if (broadcast.headerMediaUrl) {
        metaComponents.push({
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: { link: broadcast.headerMediaUrl },
            },
          ],
        });
      }

      const metaResult = await sendMetaTemplate({
        phoneNumberId,
        accessToken,
        to: cleanPhone,
        templateName:  broadcast.templateName,
        languageCode:  broadcast.languageCode,
        components:    metaComponents,
        companyId:     company._id.toString(),
        conversationId: conversation._id.toString(),
        wabaId,
      });

      const wamid = metaResult?.messages?.[0]?.id || `wamid.bcast.${Date.now()}`;

      // Persist outbound message in the inbox
      await saveOutboundMessage({
        companyId:     company._id,
        conversationId: conversation._id,
        contactId:     contact._id,
        phoneNumberId,
        wabaId,
        waId:          cleanPhone,
        senderType:    'system',
        sender: {
          id:   actor?._id || null,
          name: actor?.name || 'Campaign Scheduler',
          type: 'system',
        },
        messageType:  'template',
        body:         `[Broadcast Campaign: ${broadcast.name}]`,
        templateName: broadcast.templateName,
        wamid,
        metaMessageId: wamid,
        status:        'sent',
      });

      // Create click tracking pre-record
      // Destination URL: pull from broadcast buttons if available, else use APP_URL
      const destinationUrl =
        broadcast.buttons?.[0]?.url ||
        process.env.NEXT_PUBLIC_APP_URL ||
        'https://example.com';

      const trackingId = await createClickRecord({
        broadcastId:   broadcast._id,
        companyId:     company._id,
        contactId:     contact._id,
        phone:         cleanPhone,
        destinationUrl,
      });

      // Store CampaignRecipient with tracking info
      await CampaignRecipient.create({
        companyId:    company._id,
        broadcastId:  broadcast._id,
        contactId:    contact._id,
        phone:        cleanPhone,
        status:       'sent',
        metaMessageId: wamid,
        sentAt:        new Date(),
        trackingId,
      });

      sent++;
    } catch (err) {
      console.error(`[Broadcast] Dispatch error for ${contact.phone}:`, err.message);

      await CampaignRecipient.create({
        companyId:    company._id,
        broadcastId:  broadcast._id,
        contactId:    contact._id,
        phone:        contact.phone.replace(/[^0-9]/g, ''),
        status:       'failed',
        errorMessage: err.message,
      });

      failed++;
    }
  }

  return { sent, failed, total: targetContacts.length };
}

/**
 * Finalise broadcast after execution completes.
 * Updates stats, rates, status.
 */
export async function finaliseBroadcast(broadcast, { sent, failed, total }) {
  const deliveryRate = total > 0 ? Math.round((sent / total) * 100) : 0;

  broadcast.status      = 'COMPLETED';
  broadcast.completedAt = new Date();
  broadcast.lockedAt    = null;
  broadcast.errorMessage = '';

  broadcast.stats = {
    ...broadcast.stats,
    total,
    sent,
    delivered: sent,         // will be updated by webhook on actual delivery
    read:      0,            // will be updated by webhook on actual read receipt
    failed,
    totalClicks:  broadcast.stats?.totalClicks  || 0,
    uniqueClicks: broadcast.stats?.uniqueClicks || 0,
  };

  broadcast.rates = {
    deliveryRate,
    readRate: broadcast.rates?.readRate || 0,
    ctr:      broadcast.rates?.ctr      || 0,
  };

  await broadcast.save();
  return broadcast;
}

// ─── Cron Scheduler ───────────────────────────────────────────────────────────

/**
 * runScheduledBroadcasts
 *
 * Called by /api/cron/broadcast-scheduler (Vercel Cron, every minute).
 * Processes up to MAX_PER_RUN campaigns per invocation to stay within
 * serverless timeout limits.
 *
 * Returns a summary object for logging.
 */
const MAX_PER_RUN    = 5;
const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes — staleness guard

export async function runScheduledBroadcasts() {
  await connectDB();

  const now        = new Date();
  const lockExpiry = new Date(now.getTime() - LOCK_TIMEOUT_MS);

  const results = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };
  const { publishKafkaJob, KAFKA_TOPICS } = await import('@/lib/kafkaProducer');

  for (let i = 0; i < MAX_PER_RUN; i++) {
    const broadcast = await Broadcast.findOneAndUpdate(
      {
        status:      'SCHEDULED',
        scheduledAt: { $lte: now },
        $or: [
          { lockedAt: null },
          { lockedAt: { $lte: lockExpiry } },
        ],
      },
      {
        $set: {
          status:    'PROCESSING',
          lockedAt:  now,
          startedAt: now,
        },
      },
      {
        new:  true,
        sort: { scheduledAt: 1 },
      }
    );

    if (!broadcast) break;

    results.processed++;

    try {
      const company = await Company.findById(broadcast.companyId);
      if (!company || company.status !== 'active') {
        throw new Error(`Company ${broadcast.companyId} not found or inactive`);
      }

      await publishKafkaJob(
        KAFKA_TOPICS.BROADCASTS,
        {
          broadcastId: broadcast._id.toString(),
          companyId: company._id.toString(),
          actor: null,
        },
        broadcast._id.toString()
      );

      console.log(`[Cron] Scheduled Broadcast ${broadcast._id} claimed & enqueued to Kafka`);
      results.succeeded++;
    } catch (err) {
      console.error(`[Cron] Scheduled Broadcast ${broadcast._id} enqueue FAILED:`, err.message);

      await Broadcast.findByIdAndUpdate(broadcast._id, {
        $set: {
          status:       'FAILED',
          lockedAt:     null,
          errorMessage: err.message,
        },
        $inc: { retryCount: 1 },
      });

      results.failed++;
    }
  }

  return results;
}
