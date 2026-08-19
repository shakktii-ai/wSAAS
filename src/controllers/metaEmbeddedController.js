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
    const configId =
      process.env.META_EMBEDDED_SIGNUP_CONFIG_ID ||
      process.env.META_CONFIG_ID ||
      process.env.NEXT_PUBLIC_META_CONFIG_ID ||
      '2154509951776876';

    // TASK 4: Safe Backend Server Logging
    console.log('[META_CONFIG_SERVER_TRACE]', {
      stage: 'START_EMBEDDED_SIGNUP',
      appIdPresent: Boolean(FACEBOOK_APP_ID),
      primaryConfigEnvPresent: Boolean(process.env.META_EMBEDDED_SIGNUP_CONFIG_ID),
      secondaryConfigEnvPresent: Boolean(process.env.META_CONFIG_ID),
      publicConfigEnvPresent: Boolean(process.env.NEXT_PUBLIC_META_CONFIG_ID),
      resolvedConfigIdPresent: Boolean(configId),
      resolvedConfigIdLength: configId ? configId.length : 0,
    });

    const featureType = process.env.META_FEATURE_TYPE !== undefined
      ? process.env.META_FEATURE_TYPE
      : 'whatsapp_business_app_onboarding';

    const extrasPayload = {
      setup: {},
      sessionInfoVersion: '3',
      version: 'v4',
    };
    if (featureType) {
      extrasPayload.featureType = featureType;
    }

    return res.status(200).json({
      success: true,
      data: {
        appId: FACEBOOK_APP_ID,
        configId: configId,
        config_id: configId,
        apiVersion: META_API_VERSION,
        scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging',
        responseType: 'code',
        extras: extrasPayload,
      },
      appId: FACEBOOK_APP_ID,
      configId: configId,
      config_id: configId,
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

    // Omit redirect_uri for JS SDK FB.login popup code exchange unless explicitly configured in env
    const redirectUri = process.env.META_OAUTH_REDIRECT_URI;

    // TASK 12: SAFE SERVER DIAGNOSTICS LOG BEFORE GRAPH API EXCHANGE
    console.log('[META_TOKEN_EXCHANGE_REQUEST]', {
      clientId: FACEBOOK_APP_ID,
      redirectUri: redirectUri || 'OMITTED_FOR_JS_SDK',
      redirectUriLength: redirectUri ? redirectUri.length : 0,
      hasCode: Boolean(code),
      hasWabaId: Boolean(inputWabaId),
      hasPhoneNumberId: Boolean(inputPhoneId),
    });

    let accessToken = customAccessToken || '';
    let tokenExpiry = null;

    // Exchange Auth Code for User Access Token (Single exact server-to-server call, NO candidate loop)
    if (code && !accessToken) {
      try {
        const exchangeParams = {
          client_id: FACEBOOK_APP_ID,
          client_secret: FACEBOOK_APP_SECRET,
          code: code,
        };
        if (redirectUri && redirectUri.trim() !== '') {
          exchangeParams.redirect_uri = redirectUri.trim();
        }

        const tokenRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`, {
          params: exchangeParams,
        });

        if (tokenRes.data?.access_token) {
          accessToken = tokenRes.data.access_token;
          console.log('[META_TOKEN_EXCHANGE_RESPONSE]', {
            success: true,
            statusCode: 200,
            metaErrorCode: null,
            metaErrorType: null,
            metaErrorMessage: null,
          });
        }
      } catch (err) {
        const metaErrObj = err.response?.data?.error || {};
        console.log('[META_TOKEN_EXCHANGE_RESPONSE]', {
          success: false,
          statusCode: err.response?.status || 400,
          metaErrorCode: metaErrObj.code || 400,
          metaErrorType: metaErrObj.type || null,
          metaErrorMessage: metaErrObj.message || err.message,
        });
        const metaError = metaErrObj.message || err.message;
        return errorResponse(res, `Meta OAuth authorization failed: ${metaError}`, 400);
      }
    }

    if (!accessToken) {
      return errorResponse(res, 'Meta OAuth authorization code or valid access token is required to connect your WhatsApp Business Account.', 400);
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
    let wabaId = inputWabaId || '';
    let phoneNumberId = inputPhoneId || '';

    // If wabaId was not passed explicitly, fetch client WABAs from Meta Graph API
    if (!wabaId && accessToken) {
      try {
        const wabaListRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/me/client_whatsapp_business_accounts`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (wabaListRes.data?.data && wabaListRes.data.data.length > 0) {
          wabaId = wabaListRes.data.data[0].id;
        } else {
          const ownWabaRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/me/whatsapp_business_accounts`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (ownWabaRes.data?.data && ownWabaRes.data.data.length > 0) {
            wabaId = ownWabaRes.data.data[0].id;
          }
        }
      } catch (e) {
        console.warn('WABA list lookup notice:', e.message);
      }
    }

    if (!wabaId) {
      return errorResponse(res, 'WhatsApp Business Account (WABA ID) could not be connected from Meta authorization.', 400);
    }

    // Auto-subscribe newly authorized WABA to Shakktii Meta App Webhooks
    try {
      await axios.post(
        `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/subscribed_apps`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      console.log(`[Meta Embedded Signup] Auto-subscribed WABA ID ${wabaId} to Shakktii App`);
    } catch (subErr) {
      console.warn('[Meta Embedded Signup] WABA app subscription notice:', subErr.response?.data || subErr.message);
    }

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

    let phoneStatus = 'CONNECTED';
    let codeVerificationStatus = 'VERIFIED';

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
        phoneStatus = (phoneObj.status || 'CONNECTED').toUpperCase();
        codeVerificationStatus = (phoneObj.code_verification_status || 'VERIFIED').toUpperCase();
      }
    } catch (e) {
      console.warn('Phone numbers lookup fallback:', e.message);
    }

    if (!phoneNumberId) {
      return errorResponse(res, 'WhatsApp Phone Number ID could not be resolved for the connected WABA.', 400);
    }

    if (!displayPhoneNumber) {
      displayPhoneNumber = req.company?.phone || '';
    }

    // Check if Meta registration is required on Cloud API
    const isAlreadyConnected = phoneStatus === 'CONNECTED' || codeVerificationStatus === 'VERIFIED';
    const requestPin = req.body.pin || process.env.META_DEFAULT_PIN || '';

    if (!isAlreadyConnected) {
      if (!requestPin) {
        return errorResponse(
          res,
          'Phone number requires explicit Cloud API registration. Please provide your 6-digit two-step verification PIN.',
          400
        );
      }
      try {
        await axios.post(
          `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/register`,
          { messaging_product: 'whatsapp', pin: requestPin },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        console.log(`[Meta Embedded Signup] Registered Phone Number ID ${phoneNumberId} with Meta Cloud API`);
      } catch (regErr) {
        const metaError = regErr.response?.data?.error?.message || regErr.message;
        console.error('[Meta Embedded Signup] Phone number registration failed:', metaError);
        return errorResponse(
          res,
          `WhatsApp Phone Number registration failed: ${metaError}. Connection could not be established.`,
          400
        );
      }
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

    const safeCompany = {
      _id: updatedCompany._id,
      name: updatedCompany.name,
      slug: updatedCompany.slug,
      businessName: updatedCompany.businessName,
      displayPhoneNumber: updatedCompany.displayPhoneNumber,
      phoneNumberId: updatedCompany.phoneNumberId,
      wabaId: updatedCompany.wabaId,
      isConnected: updatedCompany.isConnected,
      connectedAt: updatedCompany.connectedAt,
      qualityRating: updatedCompany.qualityRating,
      messagingLimit: updatedCompany.messagingLimit,
    };

    return successResponse(
      res,
      {
        company: safeCompany,
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

    const token = company.accessToken || company.whatsappConfig?.accessToken || '';
    const hasValidToken = Boolean(token && token !== process.env.META_ACCESS_TOKEN);
    const isOwnerCompany = Boolean(company.wabaId && company.wabaId === process.env.META_WABA_ID);
    
    // Connection is true ONLY if token belongs to client OR company is owner company
    const isConnected = Boolean(company.isConnected && (hasValidToken || isOwnerCompany));

    const accountData = {
      isConnected,
      status: isConnected ? 'CONNECTED' : 'NEEDS_RECONNECTION',
      connectedAt: company.connectedAt || company.updatedAt,
      businessName: company.businessName || company.name,
      displayPhoneNumber: company.displayPhoneNumber || company.whatsappConfig?.displayPhoneNumber || '',
      phoneNumberId: company.phoneNumberId || company.whatsappConfig?.phoneNumberId || '',
      wabaId: company.wabaId || company.whatsappConfig?.wabaId || '',
      metaBusinessId: company.metaBusinessId || '',
      qualityRating: company.qualityRating || company.whatsappConfig?.qualityRating || 'GREEN',
      messagingLimit: company.messagingLimit || 'TIER_1K',
      webhookStatus: isConnected ? 'VERIFIED' : 'PENDING',
      templateCount,
      requiresReconnection: !isConnected && Boolean(company.wabaId),
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

    const wabaId = company.wabaId || company.whatsappConfig?.wabaId || '';
    const accessToken = company.accessToken || company.whatsappConfig?.accessToken || '';

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
      webhookVerified: false,
      whatsappConfig: {
        status: 'DISCONNECTED',
        phoneNumberId: '',
        wabaId: '',
        accessToken: '',
        displayPhoneNumber: '',
        qualityRating: 'GREEN',
        webhookVerifyToken: '',
      },
    });

    return successResponse(res, null, 'WhatsApp Business Account disconnected successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to disconnect WhatsApp account', 500);
  }
};
