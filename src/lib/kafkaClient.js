import { Kafka, logLevel } from 'kafkajs';
import EventEmitter from 'events';

// In-process fallback event bus for environments without Kafka brokers
class InProcessFallbackBus extends EventEmitter {}
export const fallbackBus = new InProcessFallbackBus();

let kafkaInstance = null;
let producerInstance = null;
let isProducerConnected = false;

/**
 * Safely normalizes CA certificate strings from environment variables.
 * Handles:
 *  - Surrounding quotes ("..." or '...')
 *  - Escaped newlines ('\n', '\\n', '\r\n')
 *  - Single-line pasted PEM certs (space-delimited base64 body)
 *  - Base64-encoded PEM certs
 */
export function normalizeCaCert(rawCert) {
  if (!rawCert) return null;
  let cert = String(rawCert).trim();

  // Strip leading/trailing quotes if user pasted with quotes
  if ((cert.startsWith('"') && cert.endsWith('"')) || (cert.startsWith("'") && cert.endsWith("'"))) {
    cert = cert.slice(1, -1).trim();
  }

  // Replace escaped newlines
  cert = cert.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

  // If base64-encoded string without PEM header, try decoding base64
  if (!cert.includes('-----BEGIN CERTIFICATE-----') && cert.length > 50) {
    try {
      const decoded = Buffer.from(cert, 'base64').toString('utf8').trim();
      if (decoded.includes('-----BEGIN CERTIFICATE-----')) {
        cert = decoded;
      }
    } catch (e) {
      // ignore decoding error if not base64
    }
  }

  // If single line where spaces replaced newlines between header/body/footer
  if (cert.includes('-----BEGIN CERTIFICATE-----') && !cert.includes('\n')) {
    const beginMarker = '-----BEGIN CERTIFICATE-----';
    const endMarker = '-----END CERTIFICATE-----';

    const beginIdx = cert.indexOf(beginMarker);
    const endIdx = cert.indexOf(endMarker);

    if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
      const body = cert.slice(beginIdx + beginMarker.length, endIdx).replace(/\s+/g, '');
      const chunkedBody = body.match(/.{1,64}/g)?.join('\n') || body;
      cert = `${beginMarker}\n${chunkedBody}\n${endMarker}`;
    }
  }

  return cert.trim();
}

/**
 * Safe diagnostic metadata getter for health check and logging.
 * NEVER exposes passwords, tokens, or raw certificate contents.
 */
export function getSafeCaDiagnostics() {
  const isKafkaEnabled = process.env.KAFKA_ENABLED === 'true';
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',').map((b) => b.trim()).filter(Boolean);
  const rawCert = process.env.KAFKA_CA_CERT;
  const normalizedCert = normalizeCaCert(rawCert);

  return {
    kafkaEnabled: isKafkaEnabled,
    brokers,
    caConfigured: Boolean(normalizedCert),
    caLength: normalizedCert ? normalizedCert.length : 0,
    caStartsWithBeginCertificate: normalizedCert ? normalizedCert.startsWith('-----BEGIN CERTIFICATE-----') : false,
    caEndsWithEndCertificate: normalizedCert ? normalizedCert.endsWith('-----END CERTIFICATE-----') : false,
    caHasNewlines: normalizedCert ? normalizedCert.includes('\n') : false,
    sslRejectUnauthorized: true,
    saslConfigured: Boolean(process.env.KAFKA_USERNAME || process.env.KAFKA_SASL_USERNAME),
    saslMechanism: (process.env.KAFKA_SASL_MECHANISM || 'scram-sha-256').toLowerCase(),
  };
}

function initKafkaClient() {
  const isKafkaEnabled = process.env.KAFKA_ENABLED === 'true';
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',').map((b) => b.trim()).filter(Boolean);
  const clientId = process.env.KAFKA_CLIENT_ID || 'syncchat-saas';

  if (!isKafkaEnabled || brokers.length === 0) {
    return null;
  }

  if (kafkaInstance) {
    return kafkaInstance;
  }

  try {
    const saslUsername = process.env.KAFKA_USERNAME || process.env.KAFKA_SASL_USERNAME;
    const saslPassword = process.env.KAFKA_PASSWORD || process.env.KAFKA_SASL_PASSWORD;
    const saslMechanism = (process.env.KAFKA_SASL_MECHANISM || 'scram-sha-256').toLowerCase();

    // SSL Configuration supporting standard SSL and custom Aiven CA cert (KAFKA_CA_CERT)
    const isSslEnabled = process.env.KAFKA_SSL === 'true' || Boolean(saslUsername && saslPassword);
    let sslConfig = false;

    if (isSslEnabled) {
      const normalizedCa = normalizeCaCert(process.env.KAFKA_CA_CERT);
      if (normalizedCa) {
        sslConfig = {
          rejectUnauthorized: true,
          ca: [normalizedCa],
        };
      } else {
        sslConfig = {
          rejectUnauthorized: true,
        };
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

    console.log('[KAFKA_TRACE] Initializing KafkaJS client with safe diagnostics:', getSafeCaDiagnostics());

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
  const isKafkaEnabled = process.env.KAFKA_ENABLED === 'true';
  if (!isKafkaEnabled) {
    return null;
  }

  const kafka = initKafkaClient();
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
  const isKafkaEnabled = process.env.KAFKA_ENABLED === 'true';
  if (!isKafkaEnabled) {
    return null;
  }

  const kafka = initKafkaClient();
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
  const isKafkaEnabled = process.env.KAFKA_ENABLED === 'true';
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',').map((b) => b.trim()).filter(Boolean);
  const diagnostics = getSafeCaDiagnostics();

  if (!isKafkaEnabled) {
    return {
      enabled: false,
      status: 'FALLBACK_MODE',
      mode: 'IN_PROCESS_ASYNC_QUEUE',
      brokers,
      diagnostics,
    };
  }

  const kafka = initKafkaClient();
  if (!kafka) {
    return {
      enabled: true,
      status: 'KAFKA_CLIENT_NOT_INITIALIZED',
      brokers,
      diagnostics,
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
      diagnostics,
    };
  } catch (err) {
    return {
      enabled: true,
      status: 'UNHEALTHY',
      error: err.message,
      brokers,
      diagnostics,
    };
  }
}

export function isKafkaEnabled() {
  return process.env.KAFKA_ENABLED === 'true';
}
