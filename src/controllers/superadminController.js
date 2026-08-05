import connectDB from '@/lib/db';
import Company from '@/models/Company';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const getAllCompanies = async (req, res) => {
  try {
    await connectDB();
    const companies = await Company.find().sort({ createdAt: -1 });

    const companyStats = await Promise.all(
      companies.map(async (c) => {
        const userCount = await User.countDocuments({ companyId: c._id });
        return {
          ...c.toObject(),
          userCount,
        };
      })
    );

    return successResponse(res, companyStats);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch companies list', 500);
  }
};

export const toggleCompanyStatus = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const { status } = req.body;

    if (!['active', 'suspended', 'pending'].includes(status)) {
      return errorResponse(res, 'Invalid company status choice', 400);
    }

    const company = await Company.findById(id);
    if (!company) {
      return errorResponse(res, 'Company not found', 404);
    }

    company.status = status;
    await company.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'COMPANY_STATUS_CHANGE',
      resource: company.name,
      details: { newStatus: status },
    });

    return successResponse(res, company, `Company status set to ${status}`);
  } catch (error) {
    return errorResponse(res, 'Failed to update company status', 500);
  }
};

export const getSystemAuditLogs = async (req, res) => {
  try {
    await connectDB();
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    return successResponse(res, logs);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch audit logs', 500);
  }
};
