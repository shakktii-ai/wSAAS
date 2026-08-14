import connectDB from '@/lib/db';
import Company from '@/models/Company';
import Message from '@/models/Message';
import { successResponse, errorResponse } from '@/lib/apiResponse';

/**
 * GET /api/billing
 * Returns Shakktii Free SaaS Plan details and connected Meta WABA billing info.
 */
export const getBillingDetails = async (req, res) => {
  try {
    await connectDB();
    const companyId = req.company._id;
    const company = await Company.findById(companyId);

    // Count dynamic messages sent this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const usedMessagesThisMonth = await Message.countDocuments({
      companyId,
      createdAt: { $gte: startOfMonth },
    });

    const billingData = {
      shakktiiPlan: {
        name: 'FREE',
        price: 0,
        currency: 'INR',
        billingProvider: company.billingProvider || 'NONE',
        subscriptionStatus: company.subscriptionStatus || 'FREE',
        isFree: true,
      },
      metaWhatsappInfo: {
        isConnected: company.isConnected || company.whatsappConfig?.status === 'CONNECTED',
        wabaId: company.wabaId || company.whatsappConfig?.wabaId || process.env.META_WABA_ID || '',
        phoneNumberId: company.phoneNumberId || company.whatsappConfig?.phoneNumberId || process.env.META_PHONE_NUMBER_ID || '',
        displayPhoneNumber: company.displayPhoneNumber || company.whatsappConfig?.displayPhoneNumber || company.phone || '',
        businessName: company.businessName || company.name || 'WhatsApp Business',
        qualityRating: company.qualityRating || 'GREEN',
        messagingLimit: company.messagingLimit || 'TIER_1K',
        metaBillingNotice: 'WhatsApp conversation charges, if applicable, are billed directly by Meta to your Meta Business Manager account.',
      },
      usageStats: {
        usedMessagesThisMonth,
      },
    };

    return successResponse(res, billingData);
  } catch (error) {
    console.error('Billing Fetch Error:', error);
    return errorResponse(res, 'Failed to fetch billing info', 500);
  }
};

/**
 * POST /api/billing
 * Shakktii SaaS is completely FREE. Returns 200 OK acknowledging free tier status.
 */
export const updateSubscriptionPlan = async (req, res) => {
  try {
    await connectDB();
    const companyId = req.company._id;

    const company = await Company.findByIdAndUpdate(
      companyId,
      {
        plan: 'free',
        billingProvider: 'NONE',
        subscriptionStatus: 'FREE',
      },
      { new: true }
    );

    return successResponse(
      res,
      {
        plan: 'FREE',
        billingProvider: 'NONE',
        subscriptionStatus: 'FREE',
        message: 'Shakktii SaaS is completely FREE. WhatsApp usage charges, if applicable, are billed directly by Meta.',
      },
      'Shakktii SaaS is 100% Free'
    );
  } catch (error) {
    return errorResponse(res, 'Failed to process request', 500);
  }
};
