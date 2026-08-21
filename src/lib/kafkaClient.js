import EventEmitter from 'events';

// In-process fallback event bus for environments without Kafka brokers
class InProcessFallbackBus extends EventEmitter {}
export const fallbackBus = new InProcessFallbackBus();

const isKafkaEnabled = process.env.KAFKA_ENABLED === 'true';
const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',').map((b) => b.trim()).filter(Boolean);
const clientId = process.env.KAFKA_CLIENT_ID || 'syncchat-saas';

let kafkaInstance = null;
let producerInstance = null;
let isProducerConnected = false;

// Dynamic loader for kafkajs to prevent build failures if module is uninstalled or bundled in Next.js
async function getKafkaJSModule() {
  try {
    const req = eval('require');
    const kafkaModule = req('kafkajs');
    return kafkaModule.default || kafkaModule;
  } catch (err) {
    console.warn('[KAFKA_TRACE] KafkaJS module not available in environment:', err.message);
    return null;
  }
}

async function initKafkaClient() {
  if (!isKafkaEnabled || brokers.length === 0 || kafkaInstance) {
    return kafkaInstance;
  }

  const { Kafka, logLevel } = (await getKafkaJSModule()) || {};
  if (!Kafka) return null;

  try {
    const saslUsername = process.env.KAFKA_USERNAME || process.env.KAFKA_SASL_USERNAME;
    const saslPassword = process.env.KAFKA_PASSWORD || process.env.KAFKA_SASL_PASSWORD;
    const saslMechanism = (process.env.KAFKA_SASL_MECHANISM || 'scram-sha-256').toLowerCase();

    // SSL Configuration supporting standard SSL and custom Aiven CA cert (KAFKA_CA_CERT)
    const isSslEnabled = process.env.KAFKA_SSL === 'true' || Boolean(saslUsername && saslPassword);
    let sslConfig = false;

    if (isSslEnabled) {
      if (process.env.KAFKA_CA_CERT) {
        sslConfig = {
          rejectUnauthorized: true,
          ca: [process.env.KAFKA_CA_CERT],
        };
      } else {
        sslConfig = true;
      }
    }

    const kafkaConfig = {
      clientId,
      brokers,
      logLevel: logLevel ? logLevel.WARN : 2,
      ssl: sslConfig,
    };

    if (saslUsername && saslPassword) {
      kafkaConfig.sasl = {
        mechanism: saslMechanism,
        username: saslUsername,
        password: saslPassword,
      };
    }

    kafkaInstance = new Kafka(kafkaConfig);
    return kafkaInstance;
  } catch (err) {
    console.warn('[KAFKA_TRACE] Failed to initialize KafkaJS client, falling back to in-process bus:', err.message);
    kafkaInstance = null;
    return null;
  }
}

/**
 * Get or create Kafka Producer instance.
 */
export async function getKafkaProducer() {
  if (!isKafkaEnabled) {
    return null;
  }

  const kafka = await initKafkaClient();
  if (!kafka) return null;

  if (producerInstance && isProducerConnected) {
    return producerInstance;
  }

  try {
    producerInstance = kafka.producer();
    await producerInstance.connect();
    isProducerConnected = true;
    console.log('[KAFKA_TRACE] Kafka Producer connected successfully');
    return producerInstance;
  } catch (err) {
    console.error('[KAFKA_TRACE] Kafka Producer connection error:', err.message);
    isProducerConnected = false;
    producerInstance = null;
    return null;
  }
}

/**
 * Create a new Kafka Consumer instance.
 */
export async function createKafkaConsumer(
  groupId = process.env.KAFKA_CONSUMER_GROUP || process.env.KAFKA_GROUP_ID || 'syncchat-broadcast-workers'
) {
  if (!isKafkaEnabled) {
    return null;
  }

  const kafka = await initKafkaClient();
  if (!kafka) return null;

  try {
    return kafka.consumer({ groupId });
  } catch (err) {
    console.error('[KAFKA_TRACE] Failed to create consumer:', err.message);
    return null;
  }
}

/**
 * Check Kafka cluster connection health.
 */
export async function checkKafkaHealth() {
  if (!isKafkaEnabled) {
    return {
      enabled: false,
      status: 'FALLBACK_MODE',
      mode: 'IN_PROCESS_ASYNC_QUEUE',
      brokers,
    };
  }

  const kafka = await initKafkaClient();
  if (!kafka) {
    return {
      enabled: true,
      status: 'KAFKAJS_MODULE_NOT_LOADED',
      brokers,
    };
  }

  try {
    const admin = kafka.admin();
    await admin.connect();
    const clusterInfo = await admin.describeCluster();
    await admin.disconnect();

    return {
      enabled: true,
      status: 'HEALTHY',
      clusterId: clusterInfo.clusterId,
      controller: clusterInfo.controller,
      brokers: clusterInfo.brokers,
    };
  } catch (err) {
    return {
      enabled: true,
      status: 'UNHEALTHY',
      error: err.message,
      brokers,
    };
  }
}

export { isKafkaEnabled };
