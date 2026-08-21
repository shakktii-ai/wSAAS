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
 * Uploads a media file (or default fallback sample image) to Meta's Resumable Upload API (App ID)
 * or WhatsApp Cloud Media API (Phone Number ID) to generate a valid `header_handle` required for template creation with IMAGE/VIDEO/DOCUMENT headers.
 */
export async function createMetaHeaderHandle({
  appId,
  phoneNumberId,
  wabaId,
  accessToken,
  mediaUrl,
  headerType = 'IMAGE',
  company,
}) {
  const resolvedAppId =
    appId ||
    company?.whatsappConfig?.appId ||
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
    process.env.FACEBOOK_CLIENT_ID ||
    process.env.META_APP_ID ||
    '';

  const resolvedPhoneNumberId =
    phoneNumberId ||
    company?.phoneNumberId ||
    company?.whatsappConfig?.phoneNumberId ||
    process.env.META_PHONE_NUMBER_ID ||
    '';

  const resolvedWabaId =
    wabaId ||
    company?.wabaId ||
    company?.whatsappConfig?.wabaId ||
    process.env.META_WABA_ID ||
    '';

  const resolvedToken =
    accessToken ||
    company?.whatsappConfig?.accessToken ||
    company?.metaAccessToken ||
    process.env.META_ACCESS_TOKEN ||
    '';

  console.log('[META_HEADER_UPLOAD_TRACE]', {
    stage: 'START_HEADER_UPLOAD',
    appIdPresent: Boolean(resolvedAppId),
    phoneNumberIdPresent: Boolean(resolvedPhoneNumberId),
    wabaIdPresent: Boolean(resolvedWabaId),
    tokenPresent: Boolean(resolvedToken),
    headerType,
    mediaUrl: mediaUrl || 'none',
  });

  if (!resolvedToken) {
    throw new Error('Meta Access Token missing for media upload');
  }

  let mediaBuffer;
  let mimeType = 'image/png';
  let fileName = 'sample.png';

  if (headerType === 'VIDEO') {
    mimeType = 'video/mp4';
    fileName = 'sample.mp4';
  } else if (headerType === 'DOCUMENT') {
    mimeType = 'application/pdf';
    fileName = 'sample.pdf';
  }

  // 1. Download media buffer from user-provided mediaUrl
  if (mediaUrl && typeof mediaUrl === 'string' && mediaUrl.startsWith('http')) {
    try {
      const response = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'SyncChat-MetaTemplateUploader/1.0',
        },
      });

      if (response.data && response.data.length > 0) {
        mediaBuffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('/')) {
          mimeType = contentType.split(';')[0].trim();
        }
      }
    } catch (err) {
      console.warn('[META_HEADER_UPLOAD_TRACE] Failed to fetch mediaUrl, using sample pixel fallback:', err.message);
    }
  }

  // 2. Fallback sample image (1x1 transparent PNG pixel buffer) if mediaUrl fetch failed or was empty
  if (!mediaBuffer || mediaBuffer.length === 0) {
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    mediaBuffer = Buffer.from(base64Png, 'base64');
    mimeType = 'image/png';
    fileName = 'sample.png';
  }

  // METHOD A: Meta Resumable Upload API using App ID (or WABA ID fallback)
  const targetUploadId = resolvedAppId || resolvedWabaId;
  if (targetUploadId) {
    try {
      console.log('[META_HEADER_UPLOAD_TRACE]', {
        stage: 'INITIATING_RESUMABLE_SESSION',
        targetUploadId,
        fileName,
        fileLength: mediaBuffer.length,
        mimeType,
      });

      const sessionUrl = `https://graph.facebook.com/${META_API_VERSION}/${targetUploadId}/uploads?file_name=${encodeURIComponent(fileName)}&file_length=${mediaBuffer.length}&file_type=${encodeURIComponent(mimeType)}`;

      const sessionRes = await axios.post(sessionUrl, null, {
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
        },
        timeout: 10000,
      });

      const uploadSessionId = sessionRes.data?.id;
      if (uploadSessionId) {
        const uploadUrl = `https://graph.facebook.com/${META_API_VERSION}/${uploadSessionId}`;
        const uploadRes = await axios.post(uploadUrl, mediaBuffer, {
          headers: {
            Authorization: `OAuth ${resolvedToken}`,
            file_offset: '0',
            'Content-Type': 'application/octet-stream',
          },
          timeout: 15000,
        });

        const handle = uploadRes.data?.h;
        if (handle) {
          console.log('[META_HEADER_UPLOAD_TRACE]', {
            stage: 'RESUMABLE_UPLOAD_SUCCESS',
            handleLength: handle.length,
          });
          return handle;
        }
      }
    } catch (resumableErr) {
      const errDetail = resumableErr.response?.data?.error || { message: resumableErr.message };
      console.warn('[META_HEADER_UPLOAD_TRACE] Resumable upload attempt failed, trying WhatsApp Cloud Media API:', errDetail);
    }
  }

  // METHOD B: WhatsApp Cloud Media API Endpoint using Phone Number ID
  if (resolvedPhoneNumberId) {
    try {
      console.log('[META_HEADER_UPLOAD_TRACE]', {
        stage: 'INITIATING_PHONE_MEDIA_UPLOAD',
        phoneNumberId: resolvedPhoneNumberId,
        mimeType,
      });

      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('file', mediaBuffer, {
        filename: fileName,
        contentType: mimeType,
      });

      const mediaUrlEndpoint = `https://graph.facebook.com/${META_API_VERSION}/${resolvedPhoneNumberId}/media`;
      const mediaRes = await axios.post(mediaUrlEndpoint, form, {
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          ...form.getHeaders(),
        },
        timeout: 15000,
      });

      const mediaId = mediaRes.data?.id;
      if (mediaId) {
        console.log('[META_HEADER_UPLOAD_TRACE]', {
          stage: 'PHONE_MEDIA_UPLOAD_SUCCESS',
          mediaId,
        });
        return mediaId;
      }
    } catch (mediaErr) {
      const errDetail = mediaErr.response?.data?.error || { message: mediaErr.message };
      console.error('[META_HEADER_UPLOAD_TRACE] WhatsApp Cloud Media upload failed:', errDetail);
    }
  }

  throw new Error(
    `Meta Header Media Upload failed. Ensure FACEBOOK_APP_ID or META_PHONE_NUMBER_ID is configured in environment or workspace setup.`
  );
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
