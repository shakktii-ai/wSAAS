import connectDB from '@/lib/db';
import Contact from '@/models/Contact';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import User from '@/models/User';
import { successResponse, errorResponse } from '@/lib/apiResponse';

/**
 * GET /api/contacts - Advanced Search, Pagination & Summary Analytics
 */
export const getContacts = async (req, res) => {
  try {
    await connectDB();
    const { search, tag, status, agentId, page = 1, limit = 50, sort = 'recent' } = req.query;
    const companyId = req.company._id;

    const query = { companyId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { waId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    if (tag && tag !== 'all') {
      query.tags = tag;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (agentId && agentId !== 'all') {
      query.ownerAgent = agentId;
    }

    const sortOption = sort === 'oldest' ? { createdAt: 1 } : sort === 'score' ? { leadScore: -1 } : { createdAt: -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const contacts = await Contact.find(query)
      .populate('ownerAgent', 'name email avatar role')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Contact.countDocuments(query);

    // CRM Analytics Summary
    const totalContacts = await Contact.countDocuments({ companyId });
    const activeContacts = await Contact.countDocuments({ companyId, status: 'active' });
    const vipCount = await Contact.countDocuments({ companyId, tags: 'VIP' });
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const newToday = await Contact.countDocuments({ companyId, createdAt: { $gte: startOfToday } });

    return successResponse(res, {
      contacts,
      summary: {
        totalContacts,
        activeContacts,
        vipCount,
        newToday,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get Contacts Error:', error);
    return errorResponse(res, 'Failed to fetch contacts directory', 500);
  }
};

/**
 * GET /api/contacts/[id] - Contact Profile & Timeline Inspector
 */
export const getContactDetails = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const companyId = req.company._id;

    const contact = await Contact.findOne({ _id: id, companyId }).populate('ownerAgent', 'name email avatar role');
    if (!contact) {
      return errorResponse(res, 'Contact profile not found', 404);
    }

    // Fetch conversation thread & messages for Customer Timeline
    const conversation = await Conversation.findOne({
      companyId,
      $or: [{ waId: contact.waId }, { customerPhone: contact.phone }],
    });

    let messages = [];
    if (conversation) {
      messages = await Message.find({ conversationId: conversation._id, companyId })
        .sort({ createdAt: -1 })
        .limit(50);
    }

    // Build Timeline Aggregation
    const timeline = messages.map((m) => ({
      id: m._id,
      type: m.direction === 'inbound' ? 'incoming_message' : 'outgoing_message',
      title: m.direction === 'inbound' ? 'Customer Message' : `Agent Reply (${m.sender?.name || 'Agent'})`,
      description: m.messageBody || m.body || `[${m.messageType} attachment]`,
      timestamp: m.timestamp || m.createdAt,
    }));

    return successResponse(res, {
      contact,
      conversation,
      timeline,
    });
  } catch (error) {
    console.error('Get Contact Details Error:', error);
    return errorResponse(res, 'Failed to fetch contact details', 500);
  }
};

/**
 * POST /api/contacts - Create Contact
 */
export const createContact = async (req, res) => {
  try {
    await connectDB();
    const { name, phone, email, companyName, designation, city, state, country, source, tags, ownerAgent, customFields } = req.body;
    const companyId = req.company._id;

    if (!name || !phone) {
      return errorResponse(res, 'Name and Phone number are required', 400);
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    const existing = await Contact.findOne({ companyId, $or: [{ phone: cleanPhone }, { waId: cleanPhone }] });
    if (existing) {
      return errorResponse(res, 'Contact with this phone number already exists', 400);
    }

    const contact = await Contact.create({
      companyId,
      waId: cleanPhone,
      phone: cleanPhone,
      name,
      email: email || '',
      companyName: companyName || '',
      designation: designation || '',
      city: city || '',
      state: state || '',
      country: country || '',
      source: source || 'WhatsApp Portal',
      tags: tags || ['Lead'],
      ownerAgent: ownerAgent || req.user._id,
      createdBy: req.user._id,
      customFields: customFields || {},
      status: 'active',
    });

    return successResponse(res, contact, 'Contact created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to create contact', 500);
  }
};

/**
 * PUT /api/contacts/[id] - Update Contact
 */
export const updateContact = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const companyId = req.company._id;

    const contact = await Contact.findOne({ _id: id, companyId });
    if (!contact) {
      return errorResponse(res, 'Contact not found', 404);
    }

    const fields = [
      'name',
      'email',
      'companyName',
      'designation',
      'city',
      'state',
      'country',
      'source',
      'tags',
      'status',
      'leadScore',
      'ownerAgent',
      'customFields',
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        contact[f] = req.body[f];
      }
    });

    contact.updatedBy = req.user._id;
    await contact.save();

    const updated = await Contact.findById(id).populate('ownerAgent', 'name email avatar role');
    return successResponse(res, updated, 'Contact updated successfully');
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to update contact', 500);
  }
};

/**
 * POST /api/contacts/bulk - Bulk Actions (Assign Agent, Add/Remove Tags, Archive, Delete)
 */
export const bulkContactAction = async (req, res) => {
  try {
    await connectDB();
    const { contactIds, action, agentId, tag } = req.body;
    const companyId = req.company._id;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return errorResponse(res, 'Select at least one contact for bulk action', 400);
    }

    let affected = 0;

    switch (action) {
      case 'assign_agent':
        const assignRes = await Contact.updateMany(
          { _id: { $in: contactIds }, companyId },
          { ownerAgent: agentId || null }
        );
        affected = assignRes.modifiedCount;
        break;

      case 'add_tag':
        if (!tag) return errorResponse(res, 'Tag is required', 400);
        const addTagRes = await Contact.updateMany(
          { _id: { $in: contactIds }, companyId },
          { $addToSet: { tags: tag } }
        );
        affected = addTagRes.modifiedCount;
        break;

      case 'remove_tag':
        if (!tag) return errorResponse(res, 'Tag is required', 400);
        const remTagRes = await Contact.updateMany(
          { _id: { $in: contactIds }, companyId },
          { $pull: { tags: tag } }
        );
        affected = remTagRes.modifiedCount;
        break;

      case 'archive':
        const archRes = await Contact.updateMany(
          { _id: { $in: contactIds }, companyId },
          { status: 'archived' }
        );
        affected = archRes.modifiedCount;
        break;

      case 'delete':
        const delRes = await Contact.deleteMany({ _id: { $in: contactIds }, companyId });
        affected = delRes.deletedCount;
        break;

      default:
        return errorResponse(res, 'Invalid bulk action type', 400);
    }

    return successResponse(res, { affected }, `Bulk action '${action}' applied to ${affected} contacts`);
  } catch (error) {
    return errorResponse(res, 'Failed to perform bulk action', 500);
  }
};

/**
 * POST /api/contacts/import - Import Contacts CSV
 */
export const importContactsCSV = async (req, res) => {
  try {
    await connectDB();
    const { contacts } = req.body;
    const companyId = req.company._id;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return errorResponse(res, 'No contacts provided for import', 400);
    }

    let importedCount = 0;
    const knownKeys = [
      'name',
      'phone',
      'waId',
      'email',
      'companyName',
      'company',
      'designation',
      'city',
      'state',
      'country',
      'source',
      'tags',
      'groups',
      'status',
      'leadScore',
      'customFields',
      '_id',
    ];

    for (const c of contacts) {
      if (!c.name || !c.phone) continue;
      const cleanPhone = String(c.phone).replace(/[^0-9]/g, '');

      // Extract custom fields from object keys that are not standard contact fields
      const customFieldsObj = {};

      for (const [k, v] of Object.entries(c)) {
        if (!knownKeys.includes(k) && v !== undefined && v !== null && String(v).trim() !== '') {
          customFieldsObj[k] = String(v).trim();
        }
      }

      if (c.customFields && typeof c.customFields === 'object') {
        for (const [k, v] of Object.entries(c.customFields)) {
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            customFieldsObj[k] = String(v).trim();
          }
        }
      }

      const existingContact = await Contact.findOne({
        companyId,
        $or: [{ phone: cleanPhone }, { waId: cleanPhone }],
      });

      if (existingContact) {
        // Merge custom fields
        const existingMap = existingContact.customFields || new Map();
        for (const [k, v] of Object.entries(customFieldsObj)) {
          if (typeof existingMap.set === 'function') {
            existingMap.set(k, v);
          } else {
            existingMap[k] = v;
          }
        }

        existingContact.name = c.name || existingContact.name;
        if (c.email) existingContact.email = c.email;
        if (c.companyName || c.company) existingContact.companyName = c.companyName || c.company;
        if (c.designation) existingContact.designation = c.designation;
        if (c.city) existingContact.city = c.city;
        if (c.state) existingContact.state = c.state;
        if (c.country) existingContact.country = c.country;
        if (c.tags) {
          const newTags = Array.isArray(c.tags) ? c.tags : [c.tags];
          existingContact.tags = Array.from(new Set([...(existingContact.tags || []), ...newTags]));
        }
        existingContact.customFields = existingMap;
        await existingContact.save();
      } else {
        await Contact.create({
          companyId,
          waId: cleanPhone,
          phone: cleanPhone,
          name: c.name,
          email: c.email || '',
          companyName: c.companyName || c.company || '',
          designation: c.designation || '',
          city: c.city || '',
          state: c.state || '',
          country: c.country || '',
          tags: Array.isArray(c.tags) ? c.tags : c.tags ? [c.tags] : ['Lead'],
          status: 'active',
          source: c.source || 'CSV Import',
          createdBy: req.user?._id || null,
          customFields: customFieldsObj,
        });
      }
      importedCount++;
    }

    return successResponse(res, { count: importedCount }, `Successfully imported ${importedCount} contacts with custom fields`);
  } catch (error) {
    console.error('Import CSV Error:', error);
    return errorResponse(res, 'Failed to import contacts from CSV', 500);
  }
};

/**
 * GET /api/contacts/export - Export Contacts CSV
 */
export const exportContactsCSV = async (req, res) => {
  try {
    await connectDB();
    const contacts = await Contact.find({ companyId: req.company._id }).sort({ createdAt: -1 });

    let csv = 'Name,Phone,WA_ID,Email,Company,City,Tags,Status,LeadScore,CreatedAt\n';
    for (const c of contacts) {
      const tagsStr = (c.tags || []).join(';');
      csv += `"${c.name}","${c.phone}","${c.waId || c.phone}","${c.email || ''}","${c.companyName || ''}","${c.city || ''}","${tagsStr}","${c.status}","${c.leadScore || 50}","${new Date(c.createdAt).toISOString()}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    return res.status(200).send(csv);
  } catch (error) {
    return errorResponse(res, 'Failed to export contacts CSV', 500);
  }
};

/**
 * DELETE /api/contacts/[id] - Delete Contact
 */
export const deleteContact = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    await Contact.findOneAndDelete({ _id: id, companyId: req.company._id });
    return successResponse(res, null, 'Contact deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete contact', 500);
  }
};
