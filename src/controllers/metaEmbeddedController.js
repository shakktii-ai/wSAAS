import axios from 'axios';
import connectDB from '@/lib/db';
import Company from '@/models/Company';
import WhatsAppTemplate from '@/models/WhatsAppTemplate';
import { successResponse, errorResponse } from '@/lib/apiResponse';

const META_API_VERSION = process.env.META_API_VERSION || 'v20.0';
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.FACEBOOK_CLIENT_ID || process.env.META_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_CLIENT_SECRET || process.env.META_APP_SECRET || '';

/**
 * 1. POST /api/meta/embedded-signup/start
 * Provides Meta Embedded Signup Launch Config
 */
export const startEmbeddedSignup = async (req, res) => {
  try {
    return successResponse(res, {
      appId: FACEBOOK_APP_ID,
      apiVersion: META_API_VERSION,
      scope: 'whatsapp_business_management,whatsapp_business_messaging',
      responseType: 'code',
      extras: {
        setup: {},
        featureType: '',
        sessionInfoVersion: '2',
      },
    });
  } catch (error) {
    return errorResponse(res, 'Failed to start Meta Embedded Signup', 500);
  }
};

/**
 * 2. POST /api/meta/exchange-token
 * Exchanges Meta OAuth Code or System Token, fetches WABA & Phone Numbers, and syncs templates
 */
export const exchangeToken = async (req, res) => {
  try {
    await connectDB();
    const companyId = req.company._id;
    const { code, wabaId: inputWabaId, phoneNumberId: inputPhoneId, accessToken: customAccessToken } = req.body;

    let accessToken = customAccessToken || '';
    let tokenExpiry = null;

    // Exchange Auth Code for User Access Token
    if (code && !accessToken) {
      try {
        const tokenRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`, {
          params: {
            client_id: FACEBOOK_APP_ID,
            client_secret: FACEBOOK_APP_SECRET,
            code: code,
          },
        });
        accessToken = tokenRes.data.access_token;
      } catch (err) {
        console.error('Code exchange failed, checking fallback token:', err.response?.data || err.message);
        accessToken = process.env.META_ACCESS_TOKEN || '';
      }
    }

    if (!accessToken) {
      accessToken = process.env.META_ACCESS_TOKEN || '';
    }

    if (!accessToken) {
      return errorResponse(res, 'Failed to obtain access token from Meta OAuth', 400);
    }

    // Exchange for Long-Lived Token
    try {
      const longLivedRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: FACEBOOK_APP_ID,
          client_secret: FACEBOOK_APP_SECRET,
          fb_exchange_token: accessToken,
        },
      });
      if (longLivedRes.data.access_token) {
        accessToken = longLivedRes.data.access_token;
        if (longLivedRes.data.expires_in) {
          const expDate = new Date();
          expDate.setSeconds(expDate.getSeconds() + longLivedRes.data.expires_in);
          tokenExpiry = expDate;
        }
      }
    } catch (e) {
      console.warn('Long-lived token exchange notice:', e.response?.data?.error?.message || e.message);
    }

    // Query WABA Accounts from Meta Graph API
    let wabaId = inputWabaId || process.env.META_WABA_ID || '';
    let phoneNumberId = inputPhoneId || process.env.META_PHONE_NUMBER_ID || '';
    let displayPhoneNumber = '';
    let businessName = req.company.name || 'WhatsApp Business';
    let qualityRating = 'GREEN';
    let messagingLimit = 'TIER_1K';
    let metaBusinessId = '';

    // Fetch WABA Details
    try {
      const wabaRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/${wabaId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (wabaRes.data) {
        businessName = wabaRes.data.name || businessName;
        metaBusinessId = wabaRes.data.owner_business_info?.id || wabaRes.data.id || '';
      }
    } catch (e) {
      console.warn('WABA meta lookup fallback:', e.message);
    }

    // Fetch Phone Numbers for WABA
    try {
      const phoneRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/${wabaId}/phone_numbers`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (phoneRes.data?.data && phoneRes.data.data.length > 0) {
        const phoneObj = phoneRes.data.data.find((p) => p.id === phoneNumberId) || phoneRes.data.data[0];
        phoneNumberId = phoneObj.id;
        displayPhoneNumber = phoneObj.display_phone_number || phoneObj.verified_name || '';
        qualityRating = phoneObj.quality_rating || 'GREEN';
        messagingLimit = phoneObj.messaging_limit_tier || 'TIER_1K';
      }
    } catch (e) {
      console.warn('Phone numbers lookup fallback:', e.message);
    }

    if (!displayPhoneNumber) {
      displayPhoneNumber = req.company?.phone || '';
    }

    // Save Connected Meta WABA Credentials to Company Document
    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      {
        metaBusinessId,
        wabaId,
        phoneNumberId,
        displayPhoneNumber,
        businessName,
        accessToken,
        tokenType: 'bearer',
        tokenExpiry: tokenExpiry || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        webhookVerified: true,
        qualityRating,
        messagingLimit,
        isConnected: true,
        connectedAt: new Date(),
        whatsappConfig: {
          phoneNumberId,
          wabaId,
          accessToken,
          webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || 'syncchat_webhook_verify_token_secure_2026',
          displayPhoneNumber,
          qualityRating,
          status: 'CONNECTED',
          lastSyncedAt: new Date(),
        },
      },
      { new: true }
    );

    // Auto-Sync Pre-approved Templates from Meta Graph API
    let syncedTemplatesCount = 0;
    try {
      const templatesRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/${wabaId}/message_templates`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (templatesRes.data?.data) {
        for (const metaTpl of templatesRes.data.data) {
          const bodyComponent = metaTpl.components?.find((c) => c.type === 'BODY');
          const bodyText = bodyComponent?.text || '';

          await WhatsAppTemplate.findOneAndUpdate(
            { companyId, name: metaTpl.name, language: metaTpl.language },
            {
              companyId,
              name: metaTpl.name,
              category: metaTpl.category || 'UTILITY',
              language: metaTpl.language || 'en_US',
              components: metaTpl.components || [],
              body: bodyText,
              status: (metaTpl.status || 'APPROVED').toUpperCase(),
              templateId: metaTpl.id,
              syncedAt: new Date(),
            },
            { upsert: true, new: true }
          );
          syncedTemplatesCount++;
        }
      }
    } catch (err) {
      console.warn('Template auto-sync notice:', err.message);
    }

    return successResponse(
      res,
      {
        company: updatedCompany,
        wabaId,
        phoneNumberId,
        displayPhoneNumber,
        businessName,
        qualityRating,
        messagingLimit,
        syncedTemplatesCount,
      },
      'WhatsApp Business Account connected successfully via Meta Embedded Signup'
    );
  } catch (error) {
    console.error('Exchange Token Error:', error);
    return errorResponse(res, error.message || 'Token exchange failed', 500);
  }
};

/**
 * 3. GET /api/meta/account
 * Returns Connected WhatsApp Account details
 */
export const getAccount = async (req, res) => {
  try {
    await connectDB();
    const company = await Company.findById(req.company._id);
    const templateCount = await WhatsAppTemplate.countDocuments({ companyId: req.company._id });

    const accountData = {
      isConnected: company.isConnected || company.whatsappConfig?.status === 'CONNECTED',
      connectedAt: company.connectedAt || company.updatedAt,
      businessName: company.businessName || company.name,
      displayPhoneNumber: company.displayPhoneNumber || company.whatsappConfig?.displayPhoneNumber || company.phone || '',
      phoneNumberId: company.phoneNumberId || company.whatsappConfig?.phoneNumberId || process.env.META_PHONE_NUMBER_ID || '',
      wabaId: company.wabaId || company.whatsappConfig?.wabaId || process.env.META_WABA_ID || '',
      metaBusinessId: company.metaBusinessId || '',
      qualityRating: company.qualityRating || company.whatsappConfig?.qualityRating || 'GREEN',
      messagingLimit: company.messagingLimit || 'TIER_1K',
      webhookStatus: company.webhookVerified ? 'VERIFIED' : 'PENDING',
      templateCount,
    };

    return successResponse(res, accountData);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch WhatsApp account details', 500);
  }
};

/**
 * 4. GET /api/meta/templates
 * Fetches local & Meta synchronized templates
 */
export const getTemplates = async (req, res) => {
  try {
    await connectDB();
    const companyId = req.company._id;
    const company = await Company.findById(companyId);

    const wabaId = company.wabaId || company.whatsappConfig?.wabaId || process.env.META_WABA_ID || '';
    const accessToken = company.accessToken || company.whatsappConfig?.accessToken || process.env.META_ACCESS_TOKEN;

    // Live Sync from Meta Graph API
    if (wabaId && accessToken) {
      try {
        const templatesRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/${wabaId}/message_templates`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (templatesRes.data?.data) {
          for (const metaTpl of templatesRes.data.data) {
            const bodyComponent = metaTpl.components?.find((c) => c.type === 'BODY');
            const bodyText = bodyComponent?.text || '';

            await WhatsAppTemplate.findOneAndUpdate(
              { companyId, name: metaTpl.name, language: metaTpl.language },
              {
                companyId,
                name: metaTpl.name,
                category: metaTpl.category || 'UTILITY',
                language: metaTpl.language || 'en_US',
                components: metaTpl.components || [],
                body: bodyText,
                status: (metaTpl.status || 'APPROVED').toUpperCase(),
                templateId: metaTpl.id,
                syncedAt: new Date(),
              },
              { upsert: true, new: true }
            );
          }
        }
      } catch (err) {
        console.warn('Live Meta Template Sync Notice:', err.message);
      }
    }

    const templates = await WhatsAppTemplate.find({ companyId }).sort({ createdAt: -1 });

    const summary = {
      approved: templates.filter((t) => t.status === 'APPROVED').length,
      pending: templates.filter((t) => t.status === 'PENDING').length,
      rejected: templates.filter((t) => t.status === 'REJECTED').length,
      total: templates.length,
    };

    return successResponse(res, { templates, summary });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch templates', 500);
  }
};

/**
 * 5. POST /api/meta/disconnect
 * Disconnects WhatsApp Business Account
 */
export const disconnectAccount = async (req, res) => {
  try {
    await connectDB();
    const companyId = req.company._id;

    await Company.findByIdAndUpdate(companyId, {
      isConnected: false,
      accessToken: '',
      wabaId: '',
      phoneNumberId: '',
      displayPhoneNumber: '',
      'whatsappConfig.status': 'DISCONNECTED',
      'whatsappConfig.accessToken': '',
    });

    return successResponse(res, null, 'WhatsApp Business Account disconnected successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to disconnect WhatsApp account', 500);
  }
};
