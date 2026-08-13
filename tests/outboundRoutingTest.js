const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Simple mock/stub objects for testing
const mockCompanyA = {
  _id: 'company_a_id_101',
  phoneNumberId: 'PHONE_NUMBER_ID_AAA',
  wabaId: 'WABA_ID_AAA',
  accessToken: 'SECRET_ACCESS_TOKEN_AAA',
  whatsappConfig: {
    phoneNumberId: 'PHONE_NUMBER_ID_AAA',
    wabaId: 'WABA_ID_AAA',
    accessToken: 'SECRET_ACCESS_TOKEN_AAA',
  },
};

const mockCompanyB = {
  _id: 'company_b_id_202',
  phoneNumberId: 'PHONE_NUMBER_ID_BBB',
  wabaId: 'WABA_ID_BBB',
  accessToken: 'SECRET_ACCESS_TOKEN_BBB',
  whatsappConfig: {
    phoneNumberId: 'PHONE_NUMBER_ID_BBB',
    wabaId: 'WABA_ID_BBB',
    accessToken: 'SECRET_ACCESS_TOKEN_BBB',
  },
};

const mockConversationA = {
  _id: 'conv_a_999',
  companyId: 'company_a_id_101',
  waId: '15551112222',
  customerPhone: '15551112222',
  phoneNumberId: 'PHONE_NUMBER_ID_AAA',
  wabaId: 'WABA_ID_AAA',
};

const mockConversationB = {
  _id: 'conv_b_888',
  companyId: 'company_a_id_101', // Same company, but connected to second number B
  waId: '15553334444',
  customerPhone: '15553334444',
  phoneNumberId: 'PHONE_NUMBER_ID_BBB',
  wabaId: 'WABA_ID_BBB',
};

// Import resolveWhatsAppCredentials from metaWhatsAppService (via require or dynamic resolution)
const { resolveWhatsAppCredentials } = require('../src/lib/metaWhatsAppService.js');

async function runOutboundRoutingTests() {
  console.log('================================================================');
  console.log('       SYNCCHAT OUTBOUND ROUTING AUDIT & QA TEST SUITE          ');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function testAssert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Test Credential Resolution Priority (Conversation-bound phone ID takes precedence)
  const credsA = resolveWhatsAppCredentials({ company: mockCompanyA, conversation: mockConversationA });
  testAssert(credsA.resolvedPhoneNumberId === 'PHONE_NUMBER_ID_AAA', 'Conversation A routes to Phone Number ID AAA');
  testAssert(credsA.resolvedWabaId === 'WABA_ID_AAA', 'Conversation A routes to WABA ID AAA');

  const credsB = resolveWhatsAppCredentials({ company: mockCompanyA, conversation: mockConversationB });
  testAssert(credsB.resolvedPhoneNumberId === 'PHONE_NUMBER_ID_BBB', 'Conversation B routes to Phone Number ID BBB (Multi-number routing)');

  // 2. Fallback to Company Phone ID if conversation does not have override
  const convNoPhone = { _id: 'conv_c_777', companyId: 'company_a_id_101', waId: '15555556666' };
  const credsCompany = resolveWhatsAppCredentials({ company: mockCompanyA, conversation: convNoPhone });
  testAssert(credsCompany.resolvedPhoneNumberId === 'PHONE_NUMBER_ID_AAA', 'Falls back to Company Phone Number ID when conversation unset');

  // 3. Check for Old Hardcoded Test Phone/WABA IDs in src/ directory
  function searchHardcodedInDir(dirPath, targetPattern) {
    let found = [];
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const f of files) {
      const fullPath = path.join(dirPath, f.name);
      if (f.isDirectory()) {
        found = found.concat(searchHardcodedInDir(fullPath, targetPattern));
      } else if (f.isFile() && (f.name.endsWith('.js') || f.name.endsWith('.jsx') || f.name.endsWith('.ts'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(targetPattern)) {
          found.push(fullPath);
        }
      }
    }
    return found;
  }

  const srcDir = path.resolve(__dirname, '../src');
  const hardcodedPhoneIdMatches = searchHardcodedInDir(srcDir, '1279365541920553');
  testAssert(hardcodedPhoneIdMatches.length === 0, `No hardcoded Phone ID 1279365541920553 in src/ (Found ${hardcodedPhoneIdMatches.length})`);

  const hardcodedWabaIdMatches = searchHardcodedInDir(srcDir, '27142090378802643');
  testAssert(hardcodedWabaIdMatches.length === 0, `No hardcoded WABA ID 27142090378802643 in src/ (Found ${hardcodedWabaIdMatches.length})`);

  // 4. Test Safe Log Formatting (Ensures no secrets leak)
  let logBuffer = '';
  const originalLog = console.log;
  console.log = (...args) => {
    logBuffer += args.join(' ') + '\n';
    originalLog(...args);
  };

  const { sendMetaWhatsAppMessage } = require('../src/lib/metaWhatsAppService.js');
  
  // Call sendMetaWhatsAppMessage with mock axios/transport or expected failure on HTTP call
  try {
    await sendMetaWhatsAppMessage({
      phoneNumberId: '1169190289620318',
      accessToken: 'MOCK_SECRET_TOKEN_DO_NOT_LOG',
      to: '15556511820',
      type: 'text',
      payload: { text: { body: 'Test routing' } },
      companyId: 'company_qa_100',
      conversationId: 'conv_qa_200',
      wabaId: 'waba_qa_300',
    });
  } catch (err) {
    // Expected axios failure in offline test, but log check is key
  }

  console.log = originalLog;

  testAssert(logBuffer.includes('[Outbound WhatsApp] companyId: company_qa_100'), 'Safe log contains companyId');
  testAssert(logBuffer.includes('conversationId: conv_qa_200'), 'Safe log contains conversationId');
  testAssert(logBuffer.includes('resolvedPhoneNumberId: 1169190289620318'), 'Safe log contains resolvedPhoneNumberId');
  testAssert(logBuffer.includes('recipientWaId: 15556511820'), 'Safe log contains recipientWaId');
  testAssert(logBuffer.includes('WABA ID: waba_qa_300'), 'Safe log contains WABA ID');
  testAssert(!logBuffer.includes('MOCK_SECRET_TOKEN_DO_NOT_LOG'), 'Safe log DOES NOT contain access token / secret');

  console.log('\n================================================================');
  console.log(`OUTBOUND ROUTING QA SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runOutboundRoutingTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
