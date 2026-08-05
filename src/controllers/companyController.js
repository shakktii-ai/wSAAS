import connectDB from '@/lib/db';
import Company from '@/models/Company';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const getCompanyDetails = async (req, res) => {
  try {
    if (!req.company) {
      return errorResponse(res, 'Company tenant context not found', 404);
    }
    return successResponse(res, req.company);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch company details', 500);
  }
};

export const updateCompanyDetails = async (req, res) => {
  try {
    await connectDB();
    const { name, phone, logo, settings } = req.body;

    const company = await Company.findById(req.company._id);
    if (!company) {
      return errorResponse(res, 'Company not found', 404);
    }

    if (name) company.name = name;
    if (phone !== undefined) company.phone = phone;
    if (logo !== undefined) company.logo = logo;
    if (settings) {
      company.settings = {
        ...company.settings,
        ...settings,
      };
    }

    await company.save();

    return successResponse(res, company, 'Company details updated successfully');
  } catch (error) {
    console.error('Update Company Error:', error);
    return errorResponse(res, 'Failed to update company details', 500);
  }
};

export const updateWhatsAppConfig = async (req, res) => {
  try {
    await connectDB();
    const { phoneNumberId, wabaId, accessToken, webhookVerifyToken, displayPhoneNumber } = req.body;

    if (!phoneNumberId || !wabaId || !accessToken) {
      return errorResponse(res, 'Phone Number ID, WABA ID, and Access Token are required', 400);
    }

    const company = await Company.findById(req.company._id);
    if (!company) {
      return errorResponse(res, 'Company not found', 404);
    }

    company.whatsappConfig = {
      phoneNumberId,
      wabaId,
      accessToken,
      webhookVerifyToken: webhookVerifyToken || process.env.META_WEBHOOK_VERIFY_TOKEN || 'syncchat_verify',
      displayPhoneNumber: displayPhoneNumber || '',
      status: 'CONNECTED',
      lastSyncedAt: new Date(),
    };

    await company.save();

    return successResponse(res, company.whatsappConfig, 'WhatsApp Business Account connected successfully');
  } catch (error) {
    console.error('Update WhatsApp Config Error:', error);
    return errorResponse(res, 'Failed to update WhatsApp configuration', 500);
  }
};

export const generateWhatsAppQRCode = async (req, res) => {
  try {
    await connectDB();
    const company = req.company;
    const { prefilledText } = req.query;

    const phone = company?.whatsappConfig?.displayPhoneNumber || company?.phone || '15556586686';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(prefilledText || 'Hello SyncChat Team! I would like to inquire about your services.');

    const whatsappDeepLink = `https://wa.me/${cleanPhone}?text=${message}`;
    const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(whatsappDeepLink)}&color=10b981&bgcolor=020617`;

    return successResponse(res, {
      displayPhone: phone,
      whatsappDeepLink,
      qrCodeImageUrl,
    });
  } catch (error) {
    return errorResponse(res, 'Failed to generate WhatsApp QR code', 500);
  }
};
