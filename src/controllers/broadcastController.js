import connectDB from '@/lib/db';
import Broadcast from '@/models/Broadcast';
import CampaignRecipient from '@/models/CampaignRecipient';
import Company from '@/models/Company';
import { executeBroadcastCore, finaliseBroadcast } from '@/lib/broadcastSchedulerService';
import { resolveWhatsAppCredentials } from '@/lib/metaWhatsAppService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// ─── List ─────────────────────────────────────────────────────────────────────

export const getBroadcasts = async (req, res) => {
  try {
    await connectDB();
    const broadcasts = await Broadcast.find({ companyId: req.company._id }).sort({ createdAt: -1 });

    const totalCampaigns  = broadcasts.length;
    const completedCount  = broadcasts.filter((b) => b.status === 'COMPLETED').length;
    const scheduledCount  = broadcasts.filter((b) => ['SCHEDULED', 'PROCESSING'].includes(b.status)).length;

    let totalSent = 0;
    broadcasts.forEach((b) => { totalSent += b.stats?.sent || 0; });

    return successResponse(res, {
      broadcasts,
      summary: { totalCampaigns, completedCount, scheduledCount, totalSent },
    });
  } catch (error) {
    console.error('getBroadcasts Error:', error);
    return errorResponse(res, 'Failed to fetch broadcasts', 500);
  }
};

// ─── Single ───────────────────────────────────────────────────────────────────

export const getBroadcast = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const broadcast = await Broadcast.findOne({ _id: id, companyId: req.company._id });
    if (!broadcast) return errorResponse(res, 'Broadcast campaign not found', 404);

    // Attach recipient summary
    const recipients = await CampaignRecipient.aggregate([
      { $match: { broadcastId: broadcast._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const recipientMap = {};
    recipients.forEach((r) => { recipientMap[r._id] = r.count; });

    // Attach button click responses
    const buttonResponses = await CampaignRecipient.find({
      broadcastId: broadcast._id,
      buttonClicked: true,
    }).select('phone buttonResponse buttonClickedAt contactId');

    return successResponse(res, { broadcast, recipientSummary: recipientMap, buttonResponses });
  } catch (error) {
    console.error('getBroadcast Error:', error);
    return errorResponse(res, 'Failed to fetch broadcast', 500);
  }
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const createBroadcast = async (req, res) => {
  try {
    await connectDB();
    const {
      name, description, campaignType, templateName, languageCode,
      targetType, targetValue, audienceFilter,
      scheduledAt, sendNow,
      headerMediaUrl, variables, buttons,
    } = req.body;
    const companyId = req.company._id;

    if (!name || !templateName) {
      return errorResponse(res, 'Broadcast campaign name and template name are required', 400);
    }

    // ── Scheduling validation ──────────────────────────────────────────────
    let finalScheduledAt = null;
    let finalStatus      = 'DRAFT';

    if (sendNow) {
      // Send Now → stays DRAFT; the UI immediately calls /execute after creation
      finalScheduledAt = null;
      finalStatus      = 'DRAFT';
    } else if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return errorResponse(res, 'Invalid scheduledAt date', 400);
      }
      if (scheduledDate <= new Date()) {
        return errorResponse(res, 'Scheduled time must be in the future. Pick a date/time at least 1 minute ahead.', 400);
      }
      finalScheduledAt = scheduledDate;
      finalStatus      = 'SCHEDULED';
    }

    const broadcast = await Broadcast.create({
      companyId,
      name,
      description:    description || '',
      campaignType:   campaignType || 'PROMOTIONAL',
      templateName,
      languageCode:   languageCode || 'en_US',
      headerMediaUrl: headerMediaUrl || '',
      variables:      variables || [],
      buttons:        buttons || [],
      targetType:     targetType || 'all',
      targetValue:    targetValue || '',
      audienceFilter: audienceFilter || {},
      scheduledAt:    finalScheduledAt,
      status:         finalStatus,
      createdBy:      req.user._id,
    });

    return successResponse(res, broadcast, 'Broadcast campaign created successfully', 201);
  } catch (error) {
    console.error('createBroadcast Error:', error);
    return errorResponse(res, 'Failed to create broadcast campaign', 500);
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateBroadcast = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const broadcast = await Broadcast.findOne({ _id: id, companyId: req.company._id });
    if (!broadcast) return errorResponse(res, 'Broadcast campaign not found', 404);

    if (!['DRAFT', 'SCHEDULED'].includes(broadcast.status)) {
      return errorResponse(res, 'Only DRAFT or SCHEDULED campaigns can be edited', 400);
    }

    const {
      name, description, campaignType, templateName, languageCode,
      targetType, targetValue, audienceFilter,
      scheduledAt, sendNow,
      headerMediaUrl, variables, buttons,
    } = req.body;

    // Re-validate scheduledAt if changing it
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return errorResponse(res, 'Invalid scheduledAt date', 400);
      }
      if (scheduledDate <= new Date()) {
        return errorResponse(res, 'Scheduled time must be in the future', 400);
      }
      broadcast.scheduledAt = scheduledDate;
      broadcast.status = 'SCHEDULED';
    }

    if (sendNow) {
      broadcast.scheduledAt = new Date();
      broadcast.status = 'SCHEDULED';
    }

    if (name)          broadcast.name          = name;
    if (description !== undefined) broadcast.description = description;
    if (campaignType)  broadcast.campaignType  = campaignType;
    if (templateName)  broadcast.templateName  = templateName;
    if (languageCode)  broadcast.languageCode  = languageCode;
    if (targetType)    broadcast.targetType    = targetType;
    if (targetValue !== undefined) broadcast.targetValue = targetValue;
    if (audienceFilter)  broadcast.audienceFilter  = audienceFilter;
    if (headerMediaUrl !== undefined) broadcast.headerMediaUrl = headerMediaUrl;
    if (variables)     broadcast.variables     = variables;
    if (buttons)       broadcast.buttons       = buttons;

    await broadcast.save();
    return successResponse(res, broadcast, 'Broadcast updated successfully');
  } catch (error) {
    console.error('updateBroadcast Error:', error);
    return errorResponse(res, 'Failed to update broadcast', 500);
  }
};

// ─── Manual Execute (Send Now) ────────────────────────────────────────────────

export const executeBroadcast = async (req, res) => {
  try {
    await connectDB();
    const { id }    = req.query;
    const company   = req.company;

    // Validate WhatsApp credentials before touching the broadcast
    const { resolvedPhoneNumberId, resolvedAccessToken } = resolveWhatsAppCredentials({ company });
    if (!resolvedPhoneNumberId || !resolvedAccessToken) {
      return errorResponse(res, 'WhatsApp Business Account is not connected', 400);
    }

    // Atomic claim: only claim if status is DRAFT or SCHEDULED and not locked
    const broadcast = await Broadcast.findOneAndUpdate(
      {
        _id:       id,
        companyId: company._id,
        status:    { $in: ['DRAFT', 'SCHEDULED'] },
        lockedAt:  null,
      },
      {
        $set: {
          status:    'PROCESSING',
          lockedAt:  new Date(),
          startedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!broadcast) {
      return errorResponse(res, 'Campaign not found, already processing, or already completed', 400);
    }

    try {
      const { sent, failed, total } = await executeBroadcastCore(broadcast, company, req.user);
      const finalBroadcast = await finaliseBroadcast(broadcast, { sent, failed, total });
      return successResponse(res, finalBroadcast, `Broadcast dispatched to ${sent} contacts (${failed} failed)`);
    } catch (execErr) {
      // Release lock and mark as FAILED
      await Broadcast.findByIdAndUpdate(broadcast._id, {
        $set: { status: 'FAILED', lockedAt: null, errorMessage: execErr.message },
        $inc: { retryCount: 1 },
      });
      console.error('[executeBroadcast] Execution failed:', execErr.message);
      return errorResponse(res, execErr.message || 'Failed to execute broadcast campaign', 500);
    }
  } catch (error) {
    console.error('executeBroadcast Error:', error);
    return errorResponse(res, 'Failed to execute broadcast campaign', 500);
  }
};

// ─── Cancel ───────────────────────────────────────────────────────────────────

export const cancelBroadcast = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;

    const broadcast = await Broadcast.findOneAndUpdate(
      {
        _id:       id,
        companyId: req.company._id,
        status:    { $in: ['DRAFT', 'SCHEDULED'] },
      },
      { $set: { status: 'CANCELLED' } },
      { new: true }
    );

    if (!broadcast) {
      return errorResponse(res, 'Campaign not found or cannot be cancelled (may already be processing)', 400);
    }

    return successResponse(res, broadcast, 'Campaign cancelled successfully');
  } catch (error) {
    console.error('cancelBroadcast Error:', error);
    return errorResponse(res, 'Failed to cancel campaign', 500);
  }
};

// ─── Pause / Resume ───────────────────────────────────────────────────────────

export const pauseBroadcast = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const broadcast = await Broadcast.findOneAndUpdate(
      { _id: id, companyId: req.company._id },
      { status: 'PAUSED' },
      { new: true }
    );
    return successResponse(res, broadcast, 'Campaign paused');
  } catch (error) {
    return errorResponse(res, 'Failed to pause campaign', 500);
  }
};

export const resumeBroadcast = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const broadcast = await Broadcast.findOneAndUpdate(
      { _id: id, companyId: req.company._id },
      { status: 'PROCESSING' },
      { new: true }
    );
    return successResponse(res, broadcast, 'Campaign resumed');
  } catch (error) {
    return errorResponse(res, 'Failed to resume campaign', 500);
  }
};

// ─── Clone ────────────────────────────────────────────────────────────────────

export const cloneBroadcast = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const existing = await Broadcast.findOne({ _id: id, companyId: req.company._id });
    if (!existing) return errorResponse(res, 'Campaign not found', 404);

    const cloned = await Broadcast.create({
      companyId:     req.company._id,
      name:          `${existing.name} (Copy)`,
      description:   existing.description,
      campaignType:  existing.campaignType,
      templateName:  existing.templateName,
      languageCode:  existing.languageCode,
      headerMediaUrl: existing.headerMediaUrl,
      variables:     existing.variables,
      buttons:       existing.buttons,
      targetType:    existing.targetType,
      targetValue:   existing.targetValue,
      audienceFilter: existing.audienceFilter,
      status:        'DRAFT',
      createdBy:     req.user._id,
    });

    return successResponse(res, cloned, 'Campaign duplicated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to clone campaign', 500);
  }
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteBroadcast = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    await Broadcast.findOneAndDelete({ _id: id, companyId: req.company._id });
    await CampaignRecipient.deleteMany({ broadcastId: id, companyId: req.company._id });
    return successResponse(res, null, 'Campaign deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete campaign', 500);
  }
};
