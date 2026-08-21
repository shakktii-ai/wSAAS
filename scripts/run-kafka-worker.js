const fs = require('fs');
const path = require('path');

// Safely load local environment files if present without overriding existing container environment variables
try {
  const dotenv = require('dotenv');
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  const envPath = path.resolve(process.cwd(), '.env');

  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: false });
  } else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
} catch (err) {
  // Ignore dotenv load errors in container environments like Railway
}

async function main() {
  console.log('🚀 Starting Standalone SyncChat Kafka Worker Process...');
  console.log(`Worker PID: ${process.pid}`);
  console.log(`Kafka Brokers: ${process.env.KAFKA_BROKERS || 'localhost:9092'}`);
  console.log(`Kafka Enabled: ${process.env.KAFKA_ENABLED || 'false'}`);
  console.log(`Kafka Topic: ${process.env.KAFKA_BROADCAST_TOPIC || 'whatsapp.broadcasts'}`);
  console.log(`Kafka Consumer Group: ${process.env.KAFKA_CONSUMER_GROUP || 'syncchat-broadcast-workers'}`);

  const { startBroadcastWorker } = require('../src/workers/broadcastWorker');
  await startBroadcastWorker();
}

main().catch((err) => {
  console.error('Fatal Worker Launcher Error:', err);
  process.exit(1);
});
