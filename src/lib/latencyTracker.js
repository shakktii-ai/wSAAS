/**
 * High-Precision End-to-End Latency and Traceability Tracker
 * Tracks inbound WhatsApp messages through Webhook -> Engine -> AI -> Outbound Send
 */

class LatencyTracker {
  createTrace(metaMessageId, companyId, phoneNumberId) {
    const traceId = metaMessageId ? `WHATSAPP_${metaMessageId}` : `WHATSAPP_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();
    let lastTime = startTime;

    return {
      traceId,
      companyId: companyId ? companyId.toString() : 'N/A',
      phoneNumberId: phoneNumberId || 'N/A',
      messageId: metaMessageId || 'N/A',
      startTime,
      stages: [],

      logStage(stageName, metadata = {}) {
        const now = Date.now();
        const elapsedFromPrevMs = now - lastTime;
        const totalElapsedMs = now - startTime;
        lastTime = now;

        const stageData = {
          stage: stageName,
          timestamp: new Date().toISOString(),
          elapsedFromPrevMs,
          totalElapsedMs,
          ...metadata,
        };

        this.stages.push(stageData);

        // Safe structured log (Never log tokens, secrets, or full PII)
        console.log(
          `[WhatsApp Latency Trace] traceId=${traceId} | stage=${stageName} | companyId=${this.companyId} | phoneNumberId=${this.phoneNumberId} | prevMs=${elapsedFromPrevMs}ms | totalMs=${totalElapsedMs}ms${metadata.automationId ? ` | autoId=${metadata.automationId}` : ''}${metadata.chatbotId ? ` | botId=${metadata.chatbotId}` : ''}`
        );

        return stageData;
      },

      logError(stageName, error, metadata = {}) {
        const now = Date.now();
        const totalElapsedMs = now - startTime;
        const errCode = error?.code || error?.status || 'ENGINE_ERROR';
        const errMsg = error?.message || String(error);

        console.error(
          `[WhatsApp Automation Error] traceId=${traceId} | companyId=${this.companyId} | phoneNumberId=${this.phoneNumberId} | stage=${stageName} | errorCode=${errCode} | errorMessage="${errMsg}" | totalMs=${totalElapsedMs}ms`
        );
      },
    };
  }
}

export const latencyTracker = new LatencyTracker();
