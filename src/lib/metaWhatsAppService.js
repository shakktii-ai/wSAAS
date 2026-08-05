import axios from 'axios';

const META_API_VERSION = process.env.META_API_VERSION || 'v20.0';
const GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Send Outbound WhatsApp Message via Meta Cloud API
 */
export async function sendMetaWhatsAppMessage({ phoneNumberId, accessToken, to, type, payload }) {
  if (!phoneNumberId || !accessToken) {
    throw new Error('Meta WhatsApp credentials missing (Phone Number ID or Access Token)');
  }

  const cleanPhone = to.replace(/[^0-9]/g, '');
  const endpoint = `${GRAPH_URL}/${phoneNumberId}/messages`;

  const requestData = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type,
    ...payload,
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
    const errObj = error.response?.data?.error || { message: error.message };
    console.error('Meta WhatsApp API Error:', errObj);
    throw new Error(errObj.message || 'Failed to send WhatsApp message via Meta Cloud API');
  }
}

/**
 * Send Text Message
 */
export async function sendMetaText({ phoneNumberId, accessToken, to, text }) {
  return sendMetaWhatsAppMessage({
    phoneNumberId,
    accessToken,
    to,
    type: 'text',
    payload: {
      text: { body: text, preview_url: true },
    },
  });
}

/**
 * Send Media Message (image, video, document, audio)
 */
export async function sendMetaMedia({ phoneNumberId, accessToken, to, type, mediaUrl, caption, filename }) {
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
  });
}

/**
 * Send Template Message
 */
export async function sendMetaTemplate({ phoneNumberId, accessToken, to, templateName, languageCode = 'en_US', components = [] }) {
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

  const requestData = {
    name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
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
    const errObj = error.response?.data?.error || { message: error.message };
    console.error('Meta Create Template Error:', errObj);
    throw new Error(errObj.message || 'Failed to create template on Meta Cloud API');
  }
}
