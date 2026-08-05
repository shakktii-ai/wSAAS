import connectDB from '@/lib/db';
import BotFlow from '@/models/BotFlow';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const getBotFlows = async (req, res) => {
  try {
    await connectDB();
    const flows = await BotFlow.find({ companyId: req.company._id }).sort({ updatedAt: -1 });
    return successResponse(res, flows);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch bot flows', 500);
  }
};

export const createBotFlow = async (req, res) => {
  try {
    await connectDB();
    const { name, triggerKeyword, nodes } = req.body;
    const companyId = req.company._id;

    if (!name) {
      return errorResponse(res, 'Bot flow name is required', 400);
    }

    const defaultNodes = nodes || [
      {
        id: 'node_1',
        type: 'text',
        title: 'Welcome Message',
        content: 'Hello! Welcome to our automated WhatsApp assistant. How can we help you today?',
        buttons: [
          { id: 'btn_1', title: 'View Products', nextNodeId: 'node_2' },
          { id: 'btn_2', title: 'Talk to Support', nextNodeId: 'node_3' },
        ],
      },
      {
        id: 'node_2',
        type: 'text',
        title: 'Product Catalog',
        content: 'Check out our latest enterprise SaaS plans at syncchat.io/pricing',
      },
      {
        id: 'node_3',
        type: 'text',
        title: 'Agent Handoff',
        content: 'An agent will be assigned to your chat shortly!',
      },
    ];

    const newFlow = await BotFlow.create({
      companyId,
      name,
      triggerKeyword: triggerKeyword || '',
      nodes: defaultNodes,
      isActive: true,
    });

    return successResponse(res, newFlow, 'Bot flow created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create bot flow', 500);
  }
};

export const updateBotFlow = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const { name, triggerKeyword, nodes, isActive } = req.body;

    const flow = await BotFlow.findOne({ _id: id, companyId: req.company._id });
    if (!flow) {
      return errorResponse(res, 'Bot flow not found', 404);
    }

    if (name) flow.name = name;
    if (triggerKeyword !== undefined) flow.triggerKeyword = triggerKeyword;
    if (nodes && Array.isArray(nodes)) flow.nodes = nodes;
    if (isActive !== undefined) flow.isActive = isActive;

    await flow.save();

    return successResponse(res, flow, 'Bot flow updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update bot flow', 500);
  }
};

export const deleteBotFlow = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    await BotFlow.findOneAndDelete({ _id: id, companyId: req.company._id });
    return successResponse(res, null, 'Bot flow deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete bot flow', 500);
  }
};
