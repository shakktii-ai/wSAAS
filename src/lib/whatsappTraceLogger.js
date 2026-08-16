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

  console.error(
    `[WhatsApp Automation Error] traceId=${traceId || 'N/A'} | stage=${stage} | companyId=${companyId} | phoneNumberId=${phoneNumberId} | waId=${waId} | errorCode=${errorCode} | errorMessage="${errorMessage}"${durStr}`
  );

  return {
    timestamp,
    traceId,
    stage,
    companyId,
    phoneNumberId,
    waId,
    messageId,
    errorCode,
    errorMessage,
  };
}
