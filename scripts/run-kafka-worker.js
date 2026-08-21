/**
 * Standalone Worker Process Launcher
 * Usage: node scripts/run-kafka-worker.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🚀 Starting Standalone SyncChat Kafka Worker Process...');
  console.log(`Worker PID: ${process.pid}`);
  console.log(`Kafka Brokers: ${process.env.KAFKA_BROKERS || 'localhost:9092'}`);
  console.log(`Kafka Enabled: ${process.env.KAFKA_ENABLED || 'false'}`);

  // Dynamic import of compiled worker module
  const { startBroadcastWorker } = require('../src/workers/broadcastWorker');
  await startBroadcastWorker();
}

main().catch((err) => {
  console.error('Fatal Worker Launcher Error:', err);
  process.exit(1);
});
