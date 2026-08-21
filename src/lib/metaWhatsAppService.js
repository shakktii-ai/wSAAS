import axios from 'axios';
import { logWhatsAppTrace, logWhatsAppError } from './whatsappTraceLogger.js';

const META_API_VERSION = process.env.META_API_VERSION || 'v20.0';
const GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Resolves the outbound WhatsApp sender credentials for a given company and conversation context.
 * Precedence:
 * 1. Explicit override parameters (overridePhoneId / overrideWabaId)
 * 2. Conversation-bound phoneNumberId / wabaId (if set when customer messaged Number A)
 * 3. Company's connected phoneNumberId / wabaId (company.phoneNumberId or company.whatsappConfig.phoneNumberId)
 * 4. Environment fallback (process.env.META_PHONE_NUMBER_ID / META_WABA_ID)
 */
export function resolveWhatsAppCredentials({ company, conversation, overridePhoneId, overrideWabaId } = {}) {
  const resolvedPhoneNumberId =
    overridePhoneId ||
    conversation?.phoneNumberId ||
    company?.phoneNumberId ||
    company?.whatsappConfig?.phoneNumberId ||
    (!company?.phoneNumberId && !company?.whatsappConfig?.phoneNumberId ? process.env.META_PHONE_NUMBER_ID : '') ||
    '';

  const resolvedWabaId =
    overrideWabaId ||
    conversation?.wabaId ||
    company?.wabaId ||
    company?.whatsappConfig?.wabaId ||
    (!company?.wabaId && !company?.whatsappConfig?.wabaId ? process.env.META_WABA_ID : '') ||
    '';

  const resolvedAccessToken =
    company?.whatsappConfig?.accessToken ||
    company?.metaAccessToken ||
    process.env.META_ACCESS_TOKEN ||
    '';

  return {
    resolvedPhoneNumberId,
    resolvedWabaId,
    resolvedAccessToken,
  };
}

/**
 * Core primitive function for dispatching Meta Cloud API WhatsApp messages.
 * - Enforces strict tenant payload formatting.
 * - Returns Graph API response object.
 * - Never logs access tokens or secrets.
 */
export async function sendMetaWhatsAppMessage({
  phoneNumberId,
  accessToken,
  to,
  type,
  payload,
  companyId,
  conversationId,
  wabaId,
  traceId,
}) {
  if (!phoneNumberId || !accessToken) {
    logWhatsAppError({
      traceId,
      stage: 'OUTBOUND_SEND_FAILED',
      companyId,
      phoneNumberId,
      errorCode: 'MISSING_CREDENTIALS',
      errorMessage: 'Meta WhatsApp credentials missing (Phone Number ID or Access Token)',
    });
    throw new Error('Meta WhatsApp credentials missing (Phone Number ID or Access Token)');
  }

  const cleanPhone = to.replace(/[^0-9]/g, '');
  const endpoint = `${GRAPH_URL}/${phoneNumberId}/messages`;

  logWhatsAppTrace({
    traceId,
    stage: 'OUTBOUND_SEND_STARTED',
    companyId,
    phoneNumberId,
    waId: cleanPhone,
    metadata: { type, tokenPresent: !!accessToken },
  });

  const requestData = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type,
    ...payload,
  };

  const sendStart = Date.now();

  try {
    const response = await axios.post(endpoint, requestData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const sendDuration = Date.now() - sendStart;
    const metaMsgId = response.data?.messages?.[0]?.id || 'N/A';

    logWhatsAppTrace({
      traceId,
      stage: 'OUTBOUND_SEND_COMPLETED',
      companyId,
      phoneNumberId,
      waId: cleanPhone,
      durationMs: sendDuration,
      metadata: { metaMessageId: metaMsgId },
    });

    return response.data;
  } catch (error) {
    const sendDuration = Date.now() - sendStart;
    const errObj = error.response?.data?.error || { message: error.message, code: error.code, error_subcode: error.error_subcode };

    logWhatsAppError({
      traceId,
      stage: 'OUTBOUND_SEND_FAILED',
      companyId,
      phoneNumberId,
      waId: cleanPhone,
      errorCode: errObj.code || errObj.status || 'HTTP_ERROR',
      errorMessage: errObj.message || 'Failed to send WhatsApp message via Meta Cloud API',
      durationMs: sendDuration,
    });

    throw new Error(errObj.message || 'Failed to send WhatsApp message via Meta Cloud API');
  }
}

/**
 * Send Text Message
 */
export async function sendMetaText({ phoneNumberId, accessToken, to, text, companyId, conversationId, wabaId, traceId }) {
  return sendMetaWhatsAppMessage({
    phoneNumberId,
    accessToken,
    to,
    type: 'text',
    payload: {
      text: { body: text, preview_url: true },
    },
    companyId,
    conversationId,
    wabaId,
    traceId,
  });
}

/**
 * Send Media Message (image, video, document, audio, sticker)
 */
export async function sendMetaMedia({ phoneNumberId, accessToken, to, type, mediaUrl, caption, filename, companyId, conversationId, wabaId }) {
  const mediaPayload = { link: mediaUrl };
  if (caption && ['image', 'video', 'document'].includes(type)) {
    mediaPayload.caption = caption;
  }
  if (filename && type === 'document') {
    mediaPayload.filename = filename;
  }

  return sendMetaWhatsAppMessage({
    phoneNumberId,
    accessToken,
    to,
    type,
    payload: {
      [type]: mediaPayload,
    },
    companyId,
    conversationId,
    wabaId,
  });
}

/**
 * Send Location Message
 */
export async function sendMetaLocation({ phoneNumberId, accessToken, to, latitude, longitude, name, address, companyId, conversationId, wabaId }) {
  return sendMetaWhatsAppMessage({
    phoneNumberId,
    accessToken,
    to,
    type: 'location',
    payload: {
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        name: name || 'Location',
        address: address || '',
      },
    },
    companyId,
    conversationId,
    wabaId,
  });
}

/**
 * Send Contact Card Message
 */
export async function sendMetaContactCard({ phoneNumberId, accessToken, to, contactName, contactPhone, companyId, conversationId, wabaId }) {
  return sendMetaWhatsAppMessage({
    phoneNumberId,
    accessToken,
    to,
    type: 'contacts',
    payload: {
      contacts: [
        {
          name: {
            formatted_name: contactName,
            first_name: contactName,
          },
          phones: [
            {
              phone: contactPhone,
              type: 'CELL',
            },
          ],
        },
      ],
    },
    companyId,
    conversationId,
    wabaId,
  });
}

/**
 * Send Template Message
 */
export async function sendMetaTemplate({ phoneNumberId, accessToken, to, templateName, languageCode = 'en_US', components = [], companyId, conversationId, wabaId }) {
  return sendMetaWhatsAppMessage({
    phoneNumberId,
    accessToken,
    to,
    type: 'template',
    payload: {
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    },
    companyId,
    conversationId,
    wabaId,
  });
}

/**
 * Fetch WABA Message Templates from Meta Graph API
 */
export async function fetchMetaTemplates({ wabaId, accessToken }) {
  if (!wabaId || !accessToken) {
    throw new Error('WABA ID or Access Token missing');
  }

  const endpoint = `${GRAPH_URL}/${wabaId}/message_templates?limit=100`;

  try {
    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data?.data || [];
  } catch (error) {
    const errObj = error.response?.data?.error || { message: error.message };
    console.error('Meta Fetch Templates Error:', errObj);
    throw new Error(errObj.message || 'Failed to fetch templates from Meta Cloud API');
  }
}

/**
 * Create a new WABA Message Template on Meta Graph API
 */
export async function createMetaTemplate({ wabaId, accessToken, name, category, language, components }) {
  if (!wabaId || !accessToken) {
    throw new Error('WABA ID or Access Token missing');
  }

  const endpoint = `${GRAPH_URL}/${wabaId}/message_templates`;

  // Meta Graph API requires template names to start with a letter [a-z]
  let cleanName = (name || '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  if (!/^[a-z]/.test(cleanName)) {
    cleanName = `tpl_${cleanName}`;
  }

  const requestData = {
    name: cleanName,
    category,
    language,
    components,
  };

  try {
    const response = await axios.post(endpoint, requestData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    const errData = error.response?.data?.error;
    const userTitle = errData?.error_user_title;
    const userMsg = errData?.error_user_msg;
    const metaMsg = errData?.message || error.message;

    let finalMsg = metaMsg;
    if (userMsg) {
      finalMsg = userTitle ? `${userTitle}: ${userMsg}` : userMsg;
    } else if (errData?.error_data?.details) {
      finalMsg = `${metaMsg} (${errData.error_data.details})`;
    }

    console.error('Meta Create Template Error:', errData || error);
    throw new Error(finalMsg || 'Failed to create template on Meta Cloud API');
  }
}

/**
 * Delete a WABA Message Template from Meta Graph API
 */
export async function deleteMetaTemplate({ wabaId, accessToken, templateName }) {
  if (!wabaId || !accessToken) {
    throw new Error('WABA ID or Access Token missing');
  }

  const endpoint = `${GRAPH_URL}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`;

  try {
    const response = await axios.delete(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    const errObj = error.response?.data?.error || { message: error.message };
    console.error('Meta Delete Template Error:', errObj);
    throw new Error(errObj.message || 'Failed to delete template from Meta Cloud API');
  }
}
