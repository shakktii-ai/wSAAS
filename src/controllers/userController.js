import connectDB from '@/lib/db';
import User from '@/models/User';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { DEFAULT_ROLE_PERMISSIONS, ROLES } from '@/lib/rbac';

export const getCompanyUsers = async (req, res) => {
  try {
    await connectDB();
    const companyId = req.company ? req.company._id : req.user.companyId;

    if (!companyId && req.user.role !== ROLES.SUPER_ADMIN) {
      return errorResponse(res, 'Company ID not found', 400);
    }

    const query = req.user.role === ROLES.SUPER_ADMIN && !companyId ? {} : { companyId };
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    return successResponse(res, users);
  } catch (error) {
    console.error('Get Users Error:', error);
    return errorResponse(res, 'Failed to fetch team users', 500);
  }
};

export const createCompanyUser = async (req, res) => {
  try {
    await connectDB();
    const { name, email, password, role } = req.body;
    const companyId = req.company ? req.company._id : req.user.companyId;

    if (!name || !email || !password || !role) {
      return errorResponse(res, 'Name, email, password, and role are required', 400);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return errorResponse(res, 'User with this email already exists', 400);
    }

    const assignedPermissions = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS[ROLES.AGENT];

    const newUser = await User.create({
      companyId,
      name,
      email: email.toLowerCase(),
      password,
      role,
      permissions: assignedPermissions,
      status: 'active',
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    return successResponse(res, userObj, 'User added successfully', 201);
  } catch (error) {
    console.error('Create User Error:', error);
    return errorResponse(res, error.message || 'Failed to create user', 500);
  }
};

export const updateCompanyUser = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;
    const { name, role, status, permissions } = req.body;

    const user = await User.findOne({ _id: id, companyId: req.company._id });
    if (!user) {
      return errorResponse(res, 'User not found in your company', 404);
    }

    if (name) user.name = name;
    if (role && ROLES[role]) {
      user.role = role;
      if (!permissions) {
        user.permissions = DEFAULT_ROLE_PERMISSIONS[role];
      }
    }
    if (status && ['active', 'inactive'].includes(status)) {
      user.status = status;
    }
    if (permissions && Array.isArray(permissions)) {
      user.permissions = permissions;
    }

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    return successResponse(res, userObj, 'User updated successfully');
  } catch (error) {
    console.error('Update User Error:', error);
    return errorResponse(res, 'Failed to update user', 500);
  }
};

export const deleteCompanyUser = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.query;

    if (id === req.user._id.toString()) {
      return errorResponse(res, 'You cannot delete your own account', 400);
    }

    const user = await User.findOneAndDelete({ _id: id, companyId: req.company._id });
    if (!user) {
      return errorResponse(res, 'User not found in your company', 404);
    }

    return successResponse(res, null, 'User deleted successfully');
  } catch (error) {
    console.error('Delete User Error:', error);
    return errorResponse(res, 'Failed to delete user', 500);
  }
};
