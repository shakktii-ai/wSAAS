import connectDB from '@/lib/db';
import Contact from '@/models/Contact';
import ContactGroup from '@/models/ContactGroup';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const getContacts = async (req, res) => {
  try {
    await connectDB();
    const { search, tag, group } = req.query;
    const companyId = req.company._id;

    const query = { companyId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (tag) {
      query.tags = tag;
    }

    if (group) {
      query.groups = group;
    }

    const contacts = await Contact.find(query).sort({ createdAt: -1 });
    return successResponse(res, contacts);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch contacts', 500);
  }
};

export const createContact = async (req, res) => {
  try {
    await connectDB();
    const { name, phone, email, tags, groups } = req.body;
    const companyId = req.company._id;

    if (!name || !phone) {
      return errorResponse(res, 'Name and Phone number are required', 400);
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    const existing = await Contact.findOne({ companyId, phone: cleanPhone });
    if (existing) {
      return errorResponse(res, 'Contact with this phone number already exists', 400);
    }

    const contact = await Contact.create({
      companyId,
      name,
      phone: cleanPhone,
      email: email || '',
      tags: tags || [],
      groups: groups || [],
    });

    return successResponse(res, contact, 'Contact created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to create contact', 500);
  }
};

export const importContactsCSV = async (req, res) => {
  try {
    await connectDB();
    const { contacts } = req.body;
    const companyId = req.company._id;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return errorResponse(res, 'No contacts provided for import', 400);
    }

    let importedCount = 0;

    for (const c of contacts) {
      if (!c.name || !c.phone) continue;
      const cleanPhone = String(c.phone).replace(/[^0-9]/g, '');

      await Contact.findOneAndUpdate(
        { companyId, phone: cleanPhone },
        {
          name: c.name,
          email: c.email || '',
          tags: Array.isArray(c.tags) ? c.tags : c.tags ? [c.tags] : [],
          groups: Array.isArray(c.groups) ? c.groups : c.groups ? [c.groups] : [],
          status: 'active',
        },
        { upsert: true }
      );
      importedCount++;
    }

    return successResponse(res, { count: importedCount }, `Successfully imported ${importedCount} contacts`);
  } catch (error) {
    console.error('Import CSV Error:', error);
    return errorResponse(res, 'Failed to import contacts from CSV', 500);
  }
};

export const exportContactsCSV = async (req, res) => {
  try {
    await connectDB();
    const contacts = await Contact.find({ companyId: req.company._id });

    // Build CSV Content
    let csv = 'Name,Phone,Email,Tags,Groups,Status\n';
    for (const c of contacts) {
      const tagsStr = (c.tags || []).join(';');
      const groupsStr = (c.groups || []).join(';');
      csv += `"${c.name}","${c.phone}","${c.email}","${tagsStr}","${groupsStr}","${c.status}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    return res.status(200).send(csv);
  } catch (error) {
    return errorResponse(res, 'Failed to export contacts CSV', 500);
  }
};

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
