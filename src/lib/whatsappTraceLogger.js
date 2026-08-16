/**
 * Production-Safe WhatsApp Pipeline Trace Logger
 * Provides structured trace logging across Webhook -> DB -> Automation -> Chatbot -> AI -> Meta Outbound
 */

export function logWhatsAppTrace({
  traceId,
  stage,
  companyId = 'N/A',
  phoneNumberId = 'N/A',
  waId = 'N/A',
  messageId = 'N/A',
  durationMs = null,
  metadata = {},
}) {
  const timestamp = new Date().toISOString();

  const traceObj = {
    timestamp,
    traceId: traceId || `WHATSAPP_${Date.now()}`,
    stage,
    companyId: companyId ? String(companyId) : 'N/A',
    phoneNumberId: phoneNumberId ? String(phoneNumberId) : 'N/A',
    waId: waId ? String(waId) : 'N/A',
    messageId: messageId ? String(messageId) : 'N/A',
    ...(durationMs !== null && durationMs !== undefined ? { durationMs: Math.max(0, Math.round(durationMs)) } : {}),
    ...metadata,
  };

  // Safe structured log (Never log access tokens, secrets, or full PII)
  const metaStr = Object.keys(metadata).length > 0 ? ` | metadata=${JSON.stringify(metadata)}` : '';
  const durStr = durationMs !== null && durationMs !== undefined ? ` | durationMs=${Math.max(0, Math.round(durationMs))}ms` : '';

  console.log(
    `[WA_TRACE] traceId=${traceObj.traceId} | stage=${stage} | companyId=${traceObj.companyId} | phoneNumberId=${traceObj.phoneNumberId} | waId=${traceObj.waId}${durStr}${metaStr}`
  );

  return traceObj;
}

export function logWhatsAppError({
  traceId,
  stage,
  companyId = 'N/A',
  phoneNumberId = 'N/A',
  waId = 'N/A',
  messageId = 'N/A',
  errorCode = 'UNKNOWN_ERROR',
  errorMessage = '',
  durationMs = null,
}) {
  const timestamp = new Date().toISOString();
  const durStr = durationMs !== null && durationMs !== undefined ? ` | durationMs=${Math.max(0, Math.round(durationMs))}ms` : '';

  return { timestamp, traceId, stage, companyId, phoneNumberId, waId, errorCode, errorMessage };
}

export function logChatbotTrace({
  traceId = 'WHATSAPP_N/A',
  stage,
  companyId = 'N/A',
  conversationId = 'N/A',
  waId = 'N/A',
  messageType = 'N/A',
  messageText = 'N/A',
  sessionId = 'N/A',
  isActive = false,
  currentNodeId = 'N/A',
  flowId = 'N/A',
  decision = 'N/A',
  buttonPayloadId = 'N/A',
  buttonText = 'N/A',
  resolvedNextNodeId = 'N/A',
  expectedInput = 'N/A',
  action = 'N/A',
  durationMs = null,
  metadata = {},
}) {
  const timestamp = new Date().toISOString();
  const durStr = durationMs !== null && durationMs !== undefined ? ` | durationMs=${Math.max(0, Math.round(durationMs))}ms` : '';
  const metaStr = Object.keys(metadata).length > 0 ? ` | metadata=${JSON.stringify(metadata)}` : '';

  console.log(
    `[CHATBOT_TRACE] traceId=${traceId} | stage=${stage} | companyId=${companyId} | conversationId=${conversationId} | waId=${waId}${sessionId !== 'N/A' ? ` | sessionId=${sessionId}` : ''}${currentNodeId !== 'N/A' ? ` | currentNodeId=${currentNodeId}` : ''}${flowId !== 'N/A' ? ` | flowId=${flowId}` : ''}${decision !== 'N/A' ? ` | decision=${decision}` : ''}${resolvedNextNodeId !== 'N/A' ? ` | resolvedNextNodeId=${resolvedNextNodeId}` : ''}${durStr}${metaStr}`
  );

  return {
    timestamp, traceId, stage, companyId, conversationId, waId, messageType, messageText, sessionId, isActive, currentNodeId, flowId, decision, buttonPayloadId, buttonText, resolvedNextNodeId, expectedInput, action, durationMs, metadata,
  };
}

export function logChatbotError({
  traceId = 'WHATSAPP_N/A',
  stage,
  companyId = 'N/A',
  conversationId = 'N/A',
  waId = 'N/A',
  errorCode = 'CHATBOT_ERROR',
  errorMessage = '',
  durationMs = null,
}) {
  const timestamp = new Date().toISOString();
  const durStr = durationMs !== null && durationMs !== undefined ? ` | durationMs=${Math.max(0, Math.round(durationMs))}ms` : '';

  console.error(
    `[CHATBOT_ERROR] traceId=${traceId} | stage=${stage} | companyId=${companyId} | conversationId=${conversationId} | waId=${waId} | errorCode=${errorCode} | errorMessage="${errorMessage}"${durStr}`
  );

  return { timestamp, traceId, stage, companyId, conversationId, waId, errorCode, errorMessage };
}
