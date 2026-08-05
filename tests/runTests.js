import { redisService } from '../src/lib/redisService.js';
import { queueService } from '../src/lib/queueService.js';
import { eventBus, EVENTS } from '../src/lib/eventBus.js';
import { socketService } from '../src/lib/socketService.js';
import { aiProviderService } from '../src/lib/aiProviderService.js';

async function runQATestSuite() {
  console.log('=============== STARTING ENTERPRISE QA SUITE ===============');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Redis Caching & Rate Limiting Test
  await redisService.set('qa_test_key', 'syncchat_val', 60);
  const cachedVal = await redisService.get('qa_test_key');
  assert(cachedVal === 'syncchat_val', 'Redis Cache Set & Get Primitive');

  const isDup = await redisService.isDuplicateWebhook('wamid.test.12345');
  assert(isDup === false, 'Redis Webhook Deduplication Initial');
  const isDupSecond = await redisService.isDuplicateWebhook('wamid.test.12345');
  assert(isDupSecond === true, 'Redis Webhook Deduplication Repeated');

  const rateCheck = await redisService.checkRateLimit('tenant_123', 5, 60);
  assert(rateCheck.allowed === true && rateCheck.current === 1, 'Redis Sliding Window Rate Limiter');

  // 2. BullMQ Queue Service Test
  const job = await queueService.addJob('broadcastQueue', 'DISPATCH_CAMPAIGN', { campaignId: 'c123' });
  assert(job && job.status === 'QUEUED', 'BullMQ Queue Job Enqueue');

  const metrics = queueService.getQueueMetrics();
  assert(metrics.broadcastQueue && metrics.broadcastQueue.total >= 1, 'BullMQ Queue Metrics Tracking');

  // 3. Centralized Event Bus Test
  let eventFired = false;
  eventBus.on(EVENTS.MESSAGE_RECEIVED, (payload) => {
    if (payload.messageId === 'msg_qa_100') eventFired = true;
  });
  eventBus.emitEvent(EVENTS.MESSAGE_RECEIVED, { messageId: 'msg_qa_100' });
  assert(eventFired === true, 'Centralized Event Bus Pub/Sub');

  // 4. Socket.IO Tenant Room Gateway Test
  const socketSent = socketService.broadcastToCompany('company_tenant_99', 'TEST_EVENT', { ok: true });
  assert(socketSent === true, 'Socket.IO Tenant Room Isolated Gateway');

  // 5. Enterprise AI Studio LLM Provider & Grounding Test
  const aiAnswer = await aiProviderService.generateCompletion({
    prompt: 'What are your enterprise subscription rates?',
    contextChunks: [{ text: 'SyncChat Enterprise pricing is $49/mo.' }],
  });
  assert(aiAnswer && aiAnswer.grounded === true && aiAnswer.confidenceScore >= 0.9, 'AI Studio RAG Grounded Completion');

  const sentimentAnalysis = await aiProviderService.analyzeSentimentAndIntent('I am very angry with your service!');
  assert(sentimentAnalysis.sentiment === 'frustrated' && sentimentAnalysis.intent === 'complaint', 'AI Sentiment & Intent Classification');

  const suggestedReplies = await aiProviderService.generateSuggestedReplies('What is your pricing?');
  assert(Array.isArray(suggestedReplies) && suggestedReplies.length === 3, 'AI Studio Suggested Replies Generator');

  console.log('============================================================');
  console.log(`QA TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================');
}

runQATestSuite().catch(console.error);
