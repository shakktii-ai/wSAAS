import connectDB from '@/lib/db';
import WhatsAppTemplate from '@/models/WhatsAppTemplate';
import { fetchMetaTemplates, createMetaTemplate } from '@/lib/metaWhatsAppService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const getTemplates = async (req, res) => {
  try {
    await connectDB();
    const templates = await WhatsAppTemplate.find({ companyId: req.company._id }).sort({ updatedAt: -1 });
    return successResponse(res, templates);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch templates', 500);
  }
};

export const syncTemplatesFromMeta = async (req, res) => {
  try {
    await connectDB();
    const company = req.company;

    const wabaId = company?.whatsappConfig?.wabaId || process.env.META_WABA_ID;
    const accessToken = company?.whatsappConfig?.accessToken || process.env.META_ACCESS_TOKEN;

    if (!wabaId || !accessToken) {
      return errorResponse(res, 'WABA ID or Access Token not configured for your workspace', 400);
    }

    const metaTemplates = await fetchMetaTemplates({ wabaId, accessToken });

    const syncedList = [];

    for (const t of metaTemplates) {
      const template = await WhatsAppTemplate.findOneAndUpdate(
        {
          companyId: company._id,
          name: t.name,
          language: t.language || 'en_US',
        },
        {
          templateId: t.id,
          category: t.category || 'UTILITY',
          status: t.status || 'APPROVED',
          components: t.components || [],
          syncedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      syncedList.push(template);
    }

    return successResponse(res, syncedList, `Successfully synced ${syncedList.length} templates from Meta Graph API`);
  } catch (error) {
    console.error('Sync Templates Error:', error);
    return errorResponse(res, error.message || 'Failed to sync templates with Meta Cloud API', 500);
  }
};

export const createNewTemplate = async (req, res) => {
  try {
    await connectDB();
    const company = req.company;
    const { name, category, language, components } = req.body;

    if (!name || !category || !components) {
      return errorResponse(res, 'Template name, category, and components are required', 400);
    }

    if (!company.whatsappConfig || !company.whatsappConfig.wabaId || !company.whatsappConfig.accessToken) {
      return errorResponse(res, 'WABA credentials missing', 400);
    }

    const { wabaId, accessToken } = company.whatsappConfig;

    const metaResult = await createMetaTemplate({
      wabaId,
      accessToken,
      name,
      category,
      language: language || 'en_US',
      components,
    });

    const newTemplate = await WhatsAppTemplate.create({
      companyId: company._id,
      templateId: metaResult.id || '',
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      language: language || 'en_US',
      category,
      status: 'APPROVED',
      components,
      syncedAt: new Date(),
    });

    return successResponse(res, newTemplate, 'Template submitted to Meta and created successfully', 201);
  } catch (error) {
    console.error('Create Template Error:', error);
    return errorResponse(res, error.message || 'Failed to create template', 500);
  }
};
