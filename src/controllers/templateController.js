import connectDB from '@/lib/db';
import WhatsAppTemplate from '@/models/WhatsAppTemplate';
import AuditLog from '@/models/AuditLog';
import { fetchMetaTemplates, createMetaTemplate, deleteMetaTemplate } from '@/lib/metaWhatsAppService';
import { socketService } from '@/lib/socketService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

/**
 * Helper to build official Meta Graph API components array from form input
 */
export function buildMetaComponents({ headerType, headerText, headerMediaUrl, bodyText, footerText, buttons, variables }) {
  const components = [];

  // 1. HEADER
  if (headerType && headerType !== 'NONE') {
    const headerComp = {
      type: 'HEADER',
      format: headerType,
    };

    if (headerType === 'TEXT') {
      headerComp.text = headerText || '';
      // Check for variables in header text like {{1}}
      const headerVarMatches = (headerText || '').match(/\{\{(\d+)\}\}/g);
      if (headerVarMatches) {
        const firstVarIdx = parseInt(headerVarMatches[0].replace(/[{}]/g, ''), 10);
        const headerVarSample = variables?.find(v => Number(v.index) === firstVarIdx || v.index === 'header' || v.isHeader)?.sampleValue || 'HeaderSample';
        headerComp.example = {
          header_text: [headerVarSample],
        };
      }
    } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
      headerComp.example = {
        header_handle: [headerMediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe'],
      };
    }
    components.push(headerComp);
  }

  // 2. BODY
  if (bodyText) {
    const bodyComp = {
      type: 'BODY',
      text: bodyText,
    };

    // Extract all {{1}}, {{2}}, etc.
    const matches = Array.from(bodyText.matchAll(/\{\{(\d+)\}\}/g));
    if (matches && matches.length > 0) {
      // Sort matches by index number
      const varIndices = Array.from(new Set(matches.map(m => parseInt(m[1], 10)))).sort((a, b) => a - b);
      const sampleRow = varIndices.map(idx => {
        const found = variables?.find(v => Number(v.index) === idx);
        return found?.sampleValue || `Sample_${idx}`;
      });

      bodyComp.example = {
        body_text: [sampleRow],
      };
    }

    components.push(bodyComp);
  }

  // 3. FOOTER
  if (footerText && footerText.trim()) {
    components.push({
      type: 'FOOTER',
      text: footerText.trim(),
    });
  }

  // 4. BUTTONS
  if (buttons && Array.isArray(buttons) && buttons.length > 0) {
    const formattedButtons = buttons.map(btn => {
      if (btn.type === 'QUICK_REPLY') {
        return {
          type: 'QUICK_REPLY',
          text: btn.text || 'Reply',
        };
      } else if (btn.type === 'PHONE_NUMBER') {
        return {
          type: 'PHONE_NUMBER',
          text: btn.text || 'Call Us',
          phone_number: btn.phoneNumber || btn.phone_number || '+1234567890',
        };
      } else if (btn.type === 'URL') {
        const urlObj = {
          type: 'URL',
          text: btn.text || 'Visit Link',
          url: btn.url || 'https://example.com',
        };
        if (btn.url && btn.url.includes('{{1}}')) {
          urlObj.example = [btn.sampleValue || 'code123'];
        }
        return urlObj;
      } else if (btn.type === 'COPY_CODE') {
        return {
          type: 'COPY_CODE',
          example: btn.code || btn.sampleValue || 'DISCOUNT50',
        };
      }
      return { type: 'QUICK_REPLY', text: btn.text || 'Action' };
    });

    components.push({
      type: 'BUTTONS',
      buttons: formattedButtons,
    });
  }

  return components;
}

/**
 * Helper for rejection suggested fixes
 */
export function parseRejectionDetails(metaReason, category) {
  const reason = metaReason || 'Template content rejected by Meta automated review policy.';
  let suggestedFix = 'Ensure body text adheres to WhatsApp policy guidelines. Avoid aggressive promotional language in Utility templates.';

  if (reason.includes('INVALID_FORMAT') || reason.includes('FORMAT')) {
    suggestedFix = 'Fix variable syntax. Placeholders must be strictly sequential {{1}}, {{2}} with valid sample values provided.';
  } else if (reason.includes('POLICY') || reason.includes('VIOLATION')) {
    suggestedFix = 'Review content against WhatsApp Commerce Policy. Ensure clear consent and transparent disclosures.';
  } else if (reason.includes('CATEGORY')) {
    suggestedFix = 'Re-classify this template under MARKETING category if it offers discounts or promotional content.';
  }

  return {
    reason,
    category: category || 'UTILITY',
    suggestedFix,
  };
}

/**
 * Audit Logger Helper
 */
async function createAuditLog({ companyId, userId, userName, action, resource, details }) {
  try {
    await AuditLog.create({
      companyId,
      userId,
      userName: userName || 'System User',
      action,
      resource: resource || 'WhatsApp Template',
      details: details || {},
    });
  } catch (err) {
    console.error('AuditLog Error:', err.message);
  }
}

/**
 * GET /api/templates
 */
export const getTemplates = async (req, res) => {
  try {
    await connectDB();
    const companyId = req.company._id;
    const { search, status, category, language, sort } = req.query;

    const filter = { companyId };

    if (search) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    if (status && status !== 'ALL') {
      filter.status = status.toUpperCase();
    }

    if (category && category !== 'ALL') {
      filter.category = category.toUpperCase();
    }

    if (language && language !== 'ALL') {
      filter.language = language;
    }

    let sortOptions = { updatedAt: -1 };
    if (sort === 'oldest') sortOptions = { createdAt: 1 };
    else if (sort === 'newest') sortOptions = { createdAt: -1 };
    else if (sort === 'alphabetical') sortOptions = { name: 1 };
    else if (sort === 'lastSynced') sortOptions = { syncedAt: -1 };

    const templates = await WhatsAppTemplate.find(filter).sort(sortOptions);
    return successResponse(res, templates);
  } catch (error) {
    console.error('getTemplates Error:', error);
    return errorResponse(res, 'Failed to fetch templates', 500);
  }
};

/**
 * GET /api/templates/:id
 */
export const getTemplateById = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const template = await WhatsAppTemplate.findOne({ _id: id, companyId: req.company._id });

    if (!template) {
      return errorResponse(res, 'Template not found', 404);
    }

    return successResponse(res, template);
  } catch (error) {
    console.error('getTemplateById Error:', error);
    return errorResponse(res, 'Failed to fetch template details', 500);
  }
};

/**
 * POST /api/templates
 */
export const createNewTemplate = async (req, res) => {
  try {
    await connectDB();
    const company = req.company;
    const user = req.user;

    const {
      name,
      category = 'UTILITY',
      language = 'en_US',
      headerType = 'NONE',
      headerText = '',
      headerMediaUrl = '',
      bodyText = '',
      footerText = '',
      buttons = [],
      variables = [],
      submit = false,
    } = req.body;

    if (!name || !bodyText) {
      return errorResponse(res, 'Template name and body text are required', 400);
    }

    const cleanName = name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');

    // Build Meta Components
    const components = buildMetaComponents({
      headerType,
      headerText,
      headerMediaUrl,
      bodyText,
      footerText,
      buttons,
      variables,
    });

    let status = 'DRAFT';
    let metaTemplateId = '';
    let submittedAt = null;

    if (submit) {
      const wabaId = company?.wabaId || company?.whatsappConfig?.wabaId;
      const accessToken = company?.accessToken || company?.whatsappConfig?.accessToken;

      if (!wabaId || !accessToken) {
        return errorResponse(
          res,
          'WhatsApp Business Account credentials (WABA ID or Access Token) are missing or expired for this workspace. Please connect your WhatsApp Business Account via Meta Embedded Signup.',
          400
        );
      }

      try {
        const metaResult = await createMetaTemplate({
          wabaId,
          accessToken,
          name: cleanName,
          category,
          language,
          components,
        });

        metaTemplateId = metaResult.id || '';
        status = metaResult.status || 'PENDING';
        submittedAt = new Date();
      } catch (metaErr) {
        console.error('Meta API Submit Error:', metaErr);
        const isAuthError = metaErr.message.includes('missing permissions') || metaErr.message.includes('does not exist') || metaErr.message.includes('100');
        const userMsg = isAuthError
          ? `Client WhatsApp authorization is incomplete. WABA ${wabaId} is not accessible with current credentials. Please reconnect WhatsApp with Meta.`
          : `Meta Submission Error: ${metaErr.message}`;
        return errorResponse(res, userMsg, 400);
      }
    }

    const template = await WhatsAppTemplate.create({
      companyId: company._id,
      templateId: metaTemplateId,
      metaTemplateId,
      name: cleanName,
      language,
      category,
      status,
      headerType,
      headerText,
      headerMediaUrl,
      bodyText,
      footerText,
      buttons,
      variables,
      components,
      version: 1,
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
      submittedAt,
      syncedAt: new Date(),
    });

    const eventName = submit ? 'TEMPLATE_SUBMITTED' : 'TEMPLATE_CREATED';
    socketService.broadcastToCompany(company._id.toString(), eventName, template);

    await createAuditLog({
      companyId: company._id,
      userId: user?._id,
      userName: user?.name,
      action: submit ? 'Template Submitted' : 'Template Created',
      resource: template.name,
      details: { templateId: template._id, status: template.status, category: template.category },
    });

    return successResponse(
      res,
      template,
      submit ? 'Template submitted to Meta successfully' : 'Template saved as draft',
      201
    );
  } catch (error) {
    console.error('createNewTemplate Error:', error);
    if (error.code === 11000) {
      return errorResponse(res, 'A template with this name and language already exists', 400);
    }
    return errorResponse(res, error.message || 'Failed to create template', 500);
  }
};

/**
 * PUT /api/templates/:id
 */
export const updateTemplate = async (req, res) => {
  try {
    await connectDB();
    const company = req.company;
    const user = req.user;
    const { id } = req.query;

    const existing = await WhatsAppTemplate.findOne({ _id: id, companyId: company._id });
    if (!existing) {
      return errorResponse(res, 'Template not found', 404);
    }

    const {
      name,
      category = existing.category,
      language = existing.language,
      headerType = existing.headerType,
      headerText = existing.headerText,
      headerMediaUrl = existing.headerMediaUrl,
      bodyText = existing.bodyText,
      footerText = existing.footerText,
      buttons = existing.buttons,
      variables = existing.variables,
      submit = false,
    } = req.body;

    const cleanName = name ? name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_') : existing.name;

    // APPROVED TEMPLATE FORKING RULE:
    // If template is APPROVED, user editing it creates a NEW DRAFT copy leaving original approved template intact!
    if (existing.status === 'APPROVED') {
      const copyName = `${cleanName}_copy`;
      const components = buildMetaComponents({
        headerType,
        headerText,
        headerMediaUrl,
        bodyText,
        footerText,
        buttons,
        variables,
      });

      const newDraftCopy = await WhatsAppTemplate.create({
        companyId: company._id,
        templateId: '',
        metaTemplateId: '',
        name: copyName,
        language,
        category,
        status: 'DRAFT',
        headerType,
        headerText,
        headerMediaUrl,
        bodyText,
        footerText,
        buttons,
        variables,
        components,
        version: existing.version + 1,
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
        syncedAt: new Date(),
      });

      socketService.broadcastToCompany(company._id.toString(), 'TEMPLATE_CREATED', newDraftCopy);
      await createAuditLog({
        companyId: company._id,
        userId: user?._id,
        userName: user?.name,
        action: 'Template Created',
        resource: newDraftCopy.name,
        details: { forkedFrom: existing.name, newDraftId: newDraftCopy._id },
      });

      return successResponse(
        res,
        newDraftCopy,
        'Original approved template preserved. A new Draft copy was created for your edits.',
        201
      );
    }

    // Standard Update for DRAFT or REJECTED templates
    const components = buildMetaComponents({
      headerType,
      headerText,
      headerMediaUrl,
      bodyText,
      footerText,
      buttons,
      variables,
    });

    existing.name = cleanName;
    existing.category = category;
    existing.language = language;
    existing.headerType = headerType;
    existing.headerText = headerText;
    existing.headerMediaUrl = headerMediaUrl;
    existing.bodyText = bodyText;
    existing.footerText = footerText;
    existing.buttons = buttons;
    existing.variables = variables;
    existing.components = components;
    existing.updatedBy = user?._id || null;

    if (submit) {
      const wabaId = company?.wabaId || company?.whatsappConfig?.wabaId;
      const accessToken = company?.accessToken || company?.whatsappConfig?.accessToken;

      if (!wabaId || !accessToken) {
        return errorResponse(res, 'WhatsApp Business Account credentials (WABA ID or Access Token) are missing or expired for this workspace.', 400);
      }

      const metaResult = await createMetaTemplate({
        wabaId,
        accessToken,
        name: cleanName,
        category,
        language,
        components,
      });

      existing.templateId = metaResult.id || existing.templateId;
      existing.metaTemplateId = metaResult.id || existing.metaTemplateId;
      existing.status = metaResult.status || 'PENDING';
      existing.submittedAt = new Date();
    }

    await existing.save();

    const eventName = submit ? 'TEMPLATE_SUBMITTED' : 'TEMPLATE_UPDATED';
    socketService.broadcastToCompany(company._id.toString(), eventName, existing);

    await createAuditLog({
      companyId: company._id,
      userId: user?._id,
      userName: user?.name,
      action: submit ? 'Template Submitted' : 'Template Updated',
      resource: existing.name,
      details: { templateId: existing._id, status: existing.status },
    });

    return successResponse(res, existing, submit ? 'Template submitted to Meta successfully' : 'Template updated');
  } catch (error) {
    console.error('updateTemplate Error:', error);
    return errorResponse(res, error.message || 'Failed to update template', 500);
  }
};

/**
 * POST /api/templates/:id/submit
 */
export const submitTemplateToMeta = async (req, res) => {
  try {
    await connectDB();
    const company = req.company;
    const user = req.user;
    const { id } = req.query;

    const template = await WhatsAppTemplate.findOne({ _id: id, companyId: company._id });
    if (!template) {
      return errorResponse(res, 'Template not found', 404);
    }

    const wabaId = company?.wabaId || company?.whatsappConfig?.wabaId;
    const accessToken = company?.accessToken || company?.whatsappConfig?.accessToken;

    if (!wabaId || !accessToken) {
      return errorResponse(res, 'WhatsApp Business Account credentials (WABA ID or Access Token) are missing or expired for this workspace.', 400);
    }

    try {
      const metaResult = await createMetaTemplate({
        wabaId,
        accessToken,
        name: template.name,
        category: template.category,
        language: template.language,
        components: template.components,
      });

      template.templateId = metaResult.id || template.templateId;
      template.metaTemplateId = metaResult.id || template.metaTemplateId;
      template.status = metaResult.status || 'PENDING';
      template.submittedAt = new Date();
      template.syncedAt = new Date();
      await template.save();

      socketService.broadcastToCompany(company._id.toString(), 'TEMPLATE_SUBMITTED', template);

      await createAuditLog({
        companyId: company._id,
        userId: user?._id,
        userName: user?.name,
        action: 'Template Submitted',
        resource: template.name,
        details: { metaTemplateId: template.metaTemplateId, status: template.status },
      });

      return successResponse(res, template, 'Template submitted to Meta for review');
    } catch (metaErr) {
      template.status = 'REJECTED';
      template.rejection = parseRejectionDetails(metaErr.message, template.category);
      await template.save();

      socketService.broadcastToCompany(company._id.toString(), 'TEMPLATE_REJECTED', template);

      await createAuditLog({
        companyId: company._id,
        userId: user?._id,
        userName: user?.name,
        action: 'Template Rejected',
        resource: template.name,
        details: { reason: metaErr.message },
      });

      return errorResponse(res, `Submission failed: ${metaErr.message}`, 400);
    }
  } catch (error) {
    console.error('submitTemplateToMeta Error:', error);
    return errorResponse(res, error.message || 'Failed to submit template to Meta', 500);
  }
};

/**
 * DELETE /api/templates/:id
 */
export const deleteTemplate = async (req, res) => {
  try {
    await connectDB();
    const company = req.company;
    const user = req.user;
    const { id, confirm } = req.query;

    const template = await WhatsAppTemplate.findOne({ _id: id, companyId: company._id });
    if (!template) {
      return errorResponse(res, 'Template not found', 404);
    }

    if (template.status !== 'DRAFT' && confirm !== 'true' && req.body?.confirm !== true) {
      return errorResponse(
        res,
        `Template status is '${template.status}'. Approved or submitted templates require confirmation to delete. Pass confirm=true to proceed.`,
        400
      );
    }

    // Try Meta deletion if metaTemplateId or name exists and not DRAFT
    if (template.status !== 'DRAFT' && template.name) {
      const wabaId = company?.wabaId || company?.whatsappConfig?.wabaId;
      const accessToken = company?.accessToken || company?.whatsappConfig?.accessToken;
      if (wabaId && accessToken) {
        try {
          await deleteMetaTemplate({ wabaId, accessToken, templateName: template.name });
        } catch (metaErr) {
          console.warn('Delete Meta Template Warning:', metaErr.message);
        }
      }
    }

    await WhatsAppTemplate.deleteOne({ _id: template._id });

    socketService.broadcastToCompany(company._id.toString(), 'TEMPLATE_DELETED', { templateId: template._id, name: template.name });

    await createAuditLog({
      companyId: company._id,
      userId: user?._id,
      userName: user?.name,
      action: 'Template Deleted',
      resource: template.name,
      details: { templateId: template._id, previousStatus: template.status },
    });

    return successResponse(res, { id: template._id }, 'Template deleted successfully');
  } catch (error) {
    console.error('deleteTemplate Error:', error);
    return errorResponse(res, error.message || 'Failed to delete template', 500);
  }
};

/**
 * POST /api/templates/sync (Manual Template Synchronization)
 */
export const syncTemplatesFromMeta = async (req, res) => {
  try {
    await connectDB();
    const company = req.company;
    const user = req.user;

    const wabaId = company?.wabaId || company?.whatsappConfig?.wabaId;
    const accessToken = company?.accessToken || company?.whatsappConfig?.accessToken;

    if (!wabaId || !accessToken) {
      return errorResponse(res, 'WhatsApp Business Account credentials (WABA ID or Access Token) are missing or expired for this workspace.', 400);
    }

    const metaTemplates = await fetchMetaTemplates({ wabaId, accessToken });
    const syncedList = [];

    for (const t of metaTemplates) {
      const rawStatus = (t.status || 'APPROVED').toUpperCase();
      let rejection = { reason: '', category: '', suggestedFix: '' };

      if (rawStatus === 'REJECTED') {
        rejection = parseRejectionDetails(t.rejected_reason || t.rejection_reason, t.category);
      }

      const updatePayload = {
        templateId: t.id,
        metaTemplateId: t.id,
        category: (t.category || 'UTILITY').toUpperCase(),
        status: rawStatus,
        components: t.components || [],
        rejection,
        syncedAt: new Date(),
      };

      if (rawStatus === 'APPROVED') {
        updatePayload.approvedAt = new Date();
      }

      const updated = await WhatsAppTemplate.findOneAndUpdate(
        {
          companyId: company._id,
          name: t.name,
          language: t.language || 'en_US',
        },
        updatePayload,
        { upsert: true, new: true }
      );
      syncedList.push(updated);
    }

    socketService.broadcastToCompany(company._id.toString(), 'TEMPLATE_SYNCED', { count: syncedList.length, timestamp: new Date() });

    await createAuditLog({
      companyId: company._id,
      userId: user?._id,
      userName: user?.name,
      action: 'Template Synced',
      resource: 'All Templates',
      details: { totalSynced: syncedList.length },
    });

    return successResponse(res, syncedList, `Successfully synced ${syncedList.length} templates from Meta Cloud API`);
  } catch (error) {
    console.error('syncTemplatesFromMeta Error:', error);
    return errorResponse(res, error.message || 'Failed to sync templates with Meta Cloud API', 500);
  }
};

/**
 * GET /api/templates/categories
 */
export const getCategories = async (req, res) => {
  return successResponse(res, [
    { key: 'MARKETING', label: 'Marketing', description: 'Promotional offers, newsletters, product announcements' },
    { key: 'UTILITY', label: 'Utility', description: 'Order updates, account alerts, receipts, transactional' },
    { key: 'AUTHENTICATION', label: 'Authentication', description: 'One-time passcodes, security verification' },
  ]);
};

/**
 * GET /api/templates/languages
 */
export const getLanguages = async (req, res) => {
  return successResponse(res, [
    { code: 'en_US', name: 'English (US)' },
    { code: 'en_GB', name: 'English (UK)' },
    { code: 'es_ES', name: 'Spanish (Spain)' },
    { code: 'es_LA', name: 'Spanish (Latin America)' },
    { code: 'pt_BR', name: 'Portuguese (Brazil)' },
    { code: 'fr_FR', name: 'French' },
    { code: 'de_DE', name: 'German' },
    { code: 'hi_IN', name: 'Hindi' },
    { code: 'ar_EG', name: 'Arabic' },
    { code: 'id_ID', name: 'Indonesian' },
  ]);
};
