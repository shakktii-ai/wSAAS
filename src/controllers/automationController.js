import connectDB from '@/lib/db';
import AutomationRule from '@/models/AutomationRule';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const getAutomations = async (req, res) => {
  try {
    await connectDB();
    const rules = await AutomationRule.find({ companyId: req.company._id }).sort({ createdAt: -1 });
    return successResponse(res, rules);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch automations', 500);
  }
};

export const createAutomation = async (req, res) => {
  try {
    await connectDB();
    const { name, trigger, conditions, actions } = req.body;
    const companyId = req.company._id;

    if (!name || !trigger) {
      return errorResponse(res, 'Automation name and trigger configuration are required', 400);
    }

    const rule = await AutomationRule.create({
      companyId,
      name,
      trigger,
      conditions: conditions || [],
      actions: actions || [],
      isActive: true,
    });

    return successResponse(res, rule, 'Automation rule created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create automation rule', 500);
  }
};

export const toggleAutomation = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;

    const rule = await AutomationRule.findOne({ _id: id, companyId: req.company._id });
    if (!rule) {
      return errorResponse(res, 'Automation rule not found', 404);
    }

    rule.isActive = !rule.isActive;
    await rule.save();

    return successResponse(res, { isActive: rule.isActive }, `Automation rule ${rule.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    return errorResponse(res, 'Failed to toggle automation rule', 500);
  }
};

export const deleteAutomation = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    await AutomationRule.findOneAndDelete({ _id: id, companyId: req.company._id });
    return successResponse(res, null, 'Automation rule deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete automation rule', 500);
  }
};
