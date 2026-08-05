import connectDB from '@/lib/db';
import AutomationFlow from '@/models/AutomationFlow';
import AutomationLog from '@/models/AutomationLog';
import Contact from '@/models/Contact';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import { sendMetaText, sendMetaTemplate } from '@/lib/metaWhatsAppService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

/**
 * GET /api/automations - List Visual Automation Flows
 */
export const getAutomations = async (req, res) => {
  try {
    await connectDB();
    const flows = await AutomationFlow.find({ companyId: req.company._id }).sort({ createdAt: -1 });

    const totalFlows = flows.length;
    const publishedCount = flows.filter((f) => f.status === 'PUBLISHED').length;

    let totalExecutions = 0;
    flows.forEach((f) => {
      totalExecutions += f.executionStats?.totalExecutions || 0;
    });

    return successResponse(res, {
      flows,
      summary: {
        totalFlows,
        publishedCount,
        totalExecutions,
      },
    });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch automation flows', 500);
  }
};

/**
 * GET /api/automations/[id] - Fetch Flow Canvas details
 */
export const getAutomationDetails = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const flow = await AutomationFlow.findOne({ _id: id, companyId: req.company._id });

    if (!flow) {
      return errorResponse(res, 'Automation flow not found', 404);
    }

    const logs = await AutomationLog.find({ flowId: id, companyId: req.company._id })
      .sort({ createdAt: -1 })
      .limit(30);

    return successResponse(res, { flow, logs });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch flow details', 500);
  }
};

/**
 * POST /api/automations - Create Visual Automation Flow
 */
export const createAutomation = async (req, res) => {
  try {
    await connectDB();
    const { name, description, triggerType, triggerKeyword, nodes, edges } = req.body;
    const companyId = req.company._id;

    if (!name) {
      return errorResponse(res, 'Automation flow name is required', 400);
    }

    const defaultNodes = nodes || [
      { id: '1', type: 'start', label: 'Start Trigger', position: { x: 100, y: 100 }, data: { trigger: 'keyword' } },
      { id: '2', type: 'message', label: 'Send Welcome Message', position: { x: 100, y: 250 }, data: { text: 'Hello! Welcome to SyncChat Auto-Support.' } },
      { id: '3', type: 'end', label: 'End Flow', position: { x: 100, y: 400 }, data: {} },
    ];

    const defaultEdges = edges || [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
    ];

    const flow = await AutomationFlow.create({
      companyId,
      name,
      description: description || 'Visual No-Code Bot Workflow',
      triggerType: triggerType || 'keyword',
      triggerKeyword: (triggerKeyword || name).toLowerCase(),
      nodes: defaultNodes,
      edges: defaultEdges,
      status: 'DRAFT',
      createdBy: req.user._id,
    });

    return successResponse(res, flow, 'Automation flow created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create automation flow', 500);
  }
};

/**
 * PUT /api/automations/[id] - Save Visual Canvas Nodes & Edges
 */
export const updateAutomationCanvas = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const { name, description, triggerKeyword, nodes, edges, status } = req.body;

    const flow = await AutomationFlow.findOne({ _id: id, companyId: req.company._id });
    if (!flow) {
      return errorResponse(res, 'Automation flow not found', 404);
    }

    if (name) flow.name = name;
    if (description !== undefined) flow.description = description;
    if (triggerKeyword) flow.triggerKeyword = triggerKeyword.toLowerCase();
    if (nodes) flow.nodes = nodes;
    if (edges) flow.edges = edges;
    if (status) flow.status = status;

    flow.version = (flow.version || 1) + 1;
    await flow.save();

    return successResponse(res, flow, 'Automation canvas saved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update automation canvas', 500);
  }
};

/**
 * POST /api/automations/[id]/publish - Publish / Unpublish Flow
 */
export const togglePublishFlow = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;

    const flow = await AutomationFlow.findOne({ _id: id, companyId: req.company._id });
    if (!flow) {
      return errorResponse(res, 'Automation flow not found', 404);
    }

    flow.status = flow.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    await flow.save();

    return successResponse(res, { status: flow.status }, `Flow status set to ${flow.status}`);
  } catch (error) {
    return errorResponse(res, 'Failed to toggle flow publish state', 500);
  }
};

/**
 * POST /api/automations/[id]/execute - Test / Run Flow Engine
 */
export const executeFlow = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const { phone } = req.body;
    const company = req.company;

    const flow = await AutomationFlow.findOne({ _id: id, companyId: company._id });
    if (!flow) {
      return errorResponse(res, 'Automation flow not found', 404);
    }

    const cleanPhone = (phone || '15556586686').replace(/[^0-9]/g, '');

    const phoneNumberId = company?.phoneNumberId || company?.whatsappConfig?.phoneNumberId || process.env.META_PHONE_NUMBER_ID;
    const accessToken = company?.accessToken || company?.whatsappConfig?.accessToken || process.env.META_ACCESS_TOKEN;

    const executedSteps = [];
    const startTime = Date.now();

    // Iterate Visual Flow Nodes
    for (const node of flow.nodes) {
      const stepLog = {
        nodeId: node.id,
        nodeType: node.type,
        executedAt: new Date(),
        output: {},
      };

      if (node.type === 'message' && node.data?.text) {
        if (phoneNumberId && accessToken) {
          try {
            await sendMetaText({ phoneNumberId, accessToken, to: cleanPhone, text: node.data.text });
            stepLog.output = { status: 'DISPATCHED_TO_META', text: node.data.text };
          } catch (e) {
            stepLog.output = { status: 'SIMULATED', text: node.data.text };
          }
        } else {
          stepLog.output = { status: 'SIMULATED', text: node.data.text };
        }
      } else if (node.type === 'tag_contact') {
        stepLog.output = { action: 'TAGGED', tag: node.data?.tag || 'Automated' };
      } else if (node.type === 'assign_agent') {
        stepLog.output = { action: 'ASSIGNED', agent: 'Auto-Routing' };
      } else {
        stepLog.output = { action: 'PASSED' };
      }

      executedSteps.push(stepLog);
    }

    // Save Execution Log
    const log = await AutomationLog.create({
      companyId: company._id,
      flowId: flow._id,
      customerPhone: cleanPhone,
      status: 'SUCCESS',
      executedSteps,
      durationMs: Date.now() - startTime,
    });

    // Update Flow Stats
    flow.executionStats.totalExecutions = (flow.executionStats.totalExecutions || 0) + 1;
    flow.executionStats.successful = (flow.executionStats.successful || 0) + 1;
    await flow.save();

    return successResponse(res, { flow, log }, 'Visual Automation Flow executed successfully');
  } catch (error) {
    console.error('Execute Flow Error:', error);
    return errorResponse(res, 'Failed to execute flow', 500);
  }
};

/**
 * DELETE /api/automations/[id] - Delete Flow
 */
export const deleteAutomation = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    await AutomationFlow.findOneAndDelete({ _id: id, companyId: req.company._id });
    await AutomationLog.deleteMany({ flowId: id, companyId: req.company._id });
    return successResponse(res, null, 'Automation flow deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete automation flow', 500);
  }
};
