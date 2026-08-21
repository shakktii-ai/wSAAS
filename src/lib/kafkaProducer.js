import { getKafkaProducer, fallbackBus, isKafkaEnabled } from './kafkaClient';
import crypto from 'crypto';

export const KAFKA_TOPICS = {
  get BROADCASTS() {
    return process.env.KAFKA_BROADCAST_TOPIC || 'whatsapp.broadcasts';
  },
  get BROADCASTS_DLQ() {
    return process.env.KAFKA_DLQ_TOPIC || 'whatsapp.broadcasts.dlq';
  },
  get WEBHOOKS() {
    return process.env.KAFKA_WEBHOOK_TOPIC || 'whatsapp.webhooks';
  },
  get AI_JOBS() {
    return process.env.KAFKA_AI_JOBS_TOPIC || 'whatsapp.ai-jobs';
  },
  get NOTIFICATIONS() {
    return process.env.KAFKA_NOTIFICATIONS_TOPIC || 'whatsapp.notifications';
  },
};

/**
 * Publish a message to a Kafka topic.
 * Uses fallback event bus if Kafka broker is disabled or offline.
 */
export async function publishKafkaJob(topic, payload, key = null) {
  const traceId = payload.traceId || `trace-${crypto.randomBytes(8).toString('hex')}`;
  const messagePayload = {
    ...payload,
    traceId,
    enqueuedAt: new Date().toISOString(),
  };

  const messageKey = key || String(payload.broadcastId || payload.companyId || 'default');

  console.log('[KAFKA_PRODUCER_TRACE]', {
    stage: 'PUBLISH_ATTEMPT',
    topic,
    key: messageKey,
    traceId,
    kafkaEnabled: isKafkaEnabled,
  });

  const producer = await getKafkaProducer();

  if (producer) {
    try {
      const record = {
        topic,
        messages: [
          {
            key: messageKey,
            value: JSON.stringify(messagePayload),
            headers: {
              traceId,
              enqueuedAt: messagePayload.enqueuedAt,
            },
          },
        ],
      };

      const result = await producer.send(record);

      console.log('[KAFKA_PRODUCER_TRACE]', {
        stage: 'PUBLISHED_TO_KAFKA',
        topic,
        partition: result[0]?.partition,
        offset: result[0]?.baseOffset,
        traceId,
      });

      return {
        success: true,
        mode: 'KAFKA',
        topic,
        partition: result[0]?.partition,
        offset: result[0]?.baseOffset,
        traceId,
      };
    } catch (err) {
      console.error('[KAFKA_PRODUCER_TRACE] Failed to publish to Kafka broker, falling back:', err.message);
    }
  }

  // Fallback Mode: Emit to in-process fallback bus
  setImmediate(() => {
    try {
      fallbackBus.emit(topic, messagePayload);
    } catch (fallbackErr) {
      console.error('[KAFKA_PRODUCER_TRACE] Fallback bus emit error:', fallbackErr.message);
    }
  });

  console.log('[KAFKA_PRODUCER_TRACE]', {
    stage: 'PUBLISHED_TO_FALLBACK_BUS',
    topic,
    traceId,
  });

  return {
    success: true,
    mode: 'IN_PROCESS_FALLBACK',
    topic,
    traceId,
  };
}
