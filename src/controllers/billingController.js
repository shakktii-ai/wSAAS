import connectDB from '@/lib/db';
import Company from '@/models/Company';
import Subscription from '@/models/Subscription';
import Invoice from '@/models/Invoice';
import Message from '@/models/Message';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const getBillingDetails = async (req, res) => {
  try {
    await connectDB();
    const companyId = req.company._id;

    // Count dynamic messages sent this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const actualMessagesCount = await Message.countDocuments({
      companyId,
      createdAt: { $gte: startOfMonth },
    });

    let subscription = await Subscription.findOne({ companyId });
    if (!subscription) {
      subscription = await Subscription.create({
        companyId,
        plan: req.company.plan ? req.company.plan.toUpperCase() : 'PRO',
        status: 'active',
        usedMessagesThisMonth: actualMessagesCount,
      });
    } else {
      subscription.usedMessagesThisMonth = actualMessagesCount;
      await subscription.save();
    }

    let invoices = await Invoice.find({ companyId }).sort({ paidAt: -1 });
    if (invoices.length === 0) {
      invoices = [
        await Invoice.create({
          companyId,
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          amount: subscription.plan === 'ENTERPRISE' ? 199.0 : subscription.plan === 'PRO' ? 49.0 : 0.0,
          currency: 'USD',
          status: 'PAID',
          paidAt: new Date(),
        }),
      ];
    }

    return successResponse(res, {
      subscription,
      invoices,
    });
  } catch (error) {
    console.error('Billing Error:', error);
    return errorResponse(res, 'Failed to fetch billing info', 500);
  }
};

export const updateSubscriptionPlan = async (req, res) => {
  try {
    await connectDB();
    const { plan } = req.body;
    const companyId = req.company._id;

    if (!['FREE', 'PRO', 'ENTERPRISE'].includes(plan)) {
      return errorResponse(res, 'Invalid plan selection', 400);
    }

    const company = await Company.findById(companyId);
    company.plan = plan.toLowerCase();
    await company.save();

    const limits = {
      FREE: 1000,
      PRO: 50000,
      ENTERPRISE: 500000,
    };

    const subscription = await Subscription.findOneAndUpdate(
      { companyId },
      {
        plan,
        monthlyMessageLimit: limits[plan] || 50000,
      },
      { upsert: true, new: true }
    );

    // Create Invoice for upgrade
    await Invoice.create({
      companyId,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      amount: plan === 'ENTERPRISE' ? 199.0 : plan === 'PRO' ? 49.0 : 0.0,
      currency: 'USD',
      status: 'PAID',
      paidAt: new Date(),
    });

    return successResponse(res, subscription, `Upgraded to ${plan} Plan successfully`);
  } catch (error) {
    return errorResponse(res, 'Failed to update subscription plan', 500);
  }
};
