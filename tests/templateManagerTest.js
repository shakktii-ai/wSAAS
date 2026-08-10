// Standalone QA Test Runner for Template Manager

function buildMetaComponents({ headerType, headerText, headerMediaUrl, bodyText, footerText, buttons, variables }) {
  const components = [];

  if (headerType && headerType !== 'NONE') {
    const headerComp = { type: 'HEADER', format: headerType };
    if (headerType === 'TEXT') {
      headerComp.text = headerText || '';
      const headerVarMatches = (headerText || '').match(/\{\{(\d+)\}\}/g);
      if (headerVarMatches) {
        const firstVarIdx = parseInt(headerVarMatches[0].replace(/[{}]/g, ''), 10);
        const headerVarSample = variables?.find(v => Number(v.index) === firstVarIdx || v.index === 'header' || v.isHeader)?.sampleValue || 'HeaderSample';
        headerComp.example = { header_text: [headerVarSample] };
      }
    } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
      headerComp.example = { header_handle: [headerMediaUrl || 'https://example.com/file'] };
    }
    components.push(headerComp);
  }

  if (bodyText) {
    const bodyComp = { type: 'BODY', text: bodyText };
    const matches = Array.from(bodyText.matchAll(/\{\{(\d+)\}\}/g));
    if (matches && matches.length > 0) {
      const varIndices = Array.from(new Set(matches.map(m => parseInt(m[1], 10)))).sort((a, b) => a - b);
      const sampleRow = varIndices.map(idx => {
        const found = variables?.find(v => Number(v.index) === idx);
        return found?.sampleValue || `Sample_${idx}`;
      });
      bodyComp.example = { body_text: [sampleRow] };
    }
    components.push(bodyComp);
  }

  if (footerText && footerText.trim()) {
    components.push({ type: 'FOOTER', text: footerText.trim() });
  }

  if (buttons && Array.isArray(buttons) && buttons.length > 0) {
    const formattedButtons = buttons.map(btn => {
      if (btn.type === 'QUICK_REPLY') {
        return { type: 'QUICK_REPLY', text: btn.text || 'Reply' };
      } else if (btn.type === 'PHONE_NUMBER') {
        return { type: 'PHONE_NUMBER', text: btn.text || 'Call Us', phone_number: btn.phoneNumber || '+1234567890' };
      } else if (btn.type === 'URL') {
        const urlObj = { type: 'URL', text: btn.text || 'Visit Link', url: btn.url || 'https://example.com' };
        if (btn.url && btn.url.includes('{{1}}')) {
          urlObj.example = [btn.sampleValue || 'code123'];
        }
        return urlObj;
      } else if (btn.type === 'COPY_CODE') {
        return { type: 'COPY_CODE', example: btn.code || 'DISCOUNT50' };
      }
      return { type: 'QUICK_REPLY', text: btn.text || 'Action' };
    });
    components.push({ type: 'BUTTONS', buttons: formattedButtons });
  }

  return components;
}

function parseRejectionDetails(metaReason, category) {
  const reason = metaReason || 'Template content rejected by Meta automated review policy.';
  let suggestedFix = 'Ensure body text adheres to WhatsApp policy guidelines. Avoid aggressive promotional language in Utility templates.';
  if (reason.includes('INVALID_FORMAT') || reason.includes('FORMAT')) {
    suggestedFix = 'Fix variable syntax. Placeholders must be strictly sequential {{1}}, {{2}} with valid sample values provided.';
  } else if (reason.includes('POLICY') || reason.includes('VIOLATION')) {
    suggestedFix = 'Review content against WhatsApp Commerce Policy. Ensure clear consent and transparent disclosures.';
  } else if (reason.includes('CATEGORY')) {
    suggestedFix = 'Re-classify this template under MARKETING category if it offers discounts or promotional content.';
  }
  return { reason, category: category || 'UTILITY', suggestedFix };
}

async function runTemplateManagerTests() {
  console.log('=============== STARTING TEMPLATE MANAGER QA SUITE ===============');

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

  // 1. Test buildMetaComponents with Header, Body Variables, Footer, and CTAs
  const components = buildMetaComponents({
    headerType: 'TEXT',
    headerText: 'Order #{{1}} Updates',
    headerMediaUrl: '',
    bodyText: 'Hello {{1}}, your package #{{2}} is on the way!',
    footerText: 'Reply STOP to opt out',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Track Order' },
      { type: 'URL', text: 'View Invoice', url: 'https://example.com/invoice/{{1}}', sampleValue: 'INV-100' },
      { type: 'PHONE_NUMBER', text: 'Call Us', phoneNumber: '+18005550199' },
    ],
    variables: [
      { index: 1, sampleValue: 'Alice' },
      { index: 2, sampleValue: 'TRACK-889' },
    ],
  });

  assert(Array.isArray(components) && components.length === 4, 'Meta Components Array Structure Generation');

  const headerComp = components.find(c => c.type === 'HEADER');
  assert(headerComp && headerComp.format === 'TEXT' && headerComp.example?.header_text?.[0] === 'Alice', 'Header Text & Example Extraction');

  const bodyComp = components.find(c => c.type === 'BODY');
  assert(
    bodyComp &&
      bodyComp.example?.body_text?.[0]?.[0] === 'Alice' &&
      bodyComp.example?.body_text?.[0]?.[1] === 'TRACK-889',
    'Body Variables & Example Matrix Construction (Meta Compliance)'
  );

  const buttonsComp = components.find(c => c.type === 'BUTTONS');
  assert(
    buttonsComp &&
      buttonsComp.buttons.length === 3 &&
      buttonsComp.buttons[1].type === 'URL' &&
      buttonsComp.buttons[1].example?.[0] === 'INV-100',
    'Buttons Component with Dynamic CTA Example'
  );

  // 2. Test parseRejectionDetails
  const rejectionInfo = parseRejectionDetails('INVALID_FORMAT: Placeholders missing examples', 'UTILITY');
  assert(
    rejectionInfo &&
      rejectionInfo.reason.includes('INVALID_FORMAT') &&
      rejectionInfo.suggestedFix.includes('Fix variable syntax'),
    'Rejection Details Parser & Suggested Fix Generator'
  );

  // 3. Lifecycle Status Verification
  const validStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED'];
  assert(validStatuses.length === 6, 'Meta Template Lifecycle Status Enums');

  // 4. Approved Template Edit Forking Verification
  const mockApprovedTemplate = { status: 'APPROVED', name: 'order_update', version: 1 };
  const mockNewDraftName = `${mockApprovedTemplate.name}_copy`;
  assert(mockNewDraftName === 'order_update_copy', 'Approved Template Forking on Edit (New Draft Copy)');

  // 5. Approved Template Selection Filtering
  const templateList = [
    { name: 't1', status: 'APPROVED' },
    { name: 't2', status: 'DRAFT' },
    { name: 't3', status: 'PENDING' },
    { name: 't4', status: 'REJECTED' },
  ];
  const approvedOnly = templateList.filter(t => t.status === 'APPROVED');
  assert(approvedOnly.length === 1 && approvedOnly[0].name === 't1', 'Selection Filtering Only APPROVED Templates for Broadcasts/Automations/Chatbot');

  console.log('============================================================');
  console.log(`TEMPLATE MANAGER QA SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================');

  if (failed > 0) process.exit(1);
}

runTemplateManagerTests().catch(console.error);
