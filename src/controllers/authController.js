import connectDB from '@/lib/db';
import User from '@/models/User';
import Company from '@/models/Company';
import RefreshToken from '@/models/RefreshToken';
import { signAccessToken, signRefreshToken, setAuthCookies, clearAuthCookies } from '@/lib/jwt';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { DEFAULT_ROLE_PERMISSIONS, ROLES } from '@/lib/rbac';

export const registerCompanyAndAdmin = async (req, res) => {
  try {
    await connectDB();
    const { companyName, name, email, password } = req.body;

    if (!companyName || !name || !email || !password) {
      return errorResponse(res, 'Please provide companyName, name, email, and password', 400);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return errorResponse(res, 'User with this email already exists', 400);
    }

    // Create Company Slug
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

    // Create Company Tenant
    const company = await Company.create({
      name: companyName,
      slug,
      email: email.toLowerCase(),
      status: 'active',
      plan: 'pro',
    });

    // Create Company Admin User
    const user = await User.create({
      companyId: company._id,
      name,
      email: email.toLowerCase(),
      password,
      role: ROLES.COMPANY_ADMIN,
      permissions: DEFAULT_ROLE_PERMISSIONS[ROLES.COMPANY_ADMIN],
      status: 'active',
    });

    // Generate JWT Tokens
    const accessToken = signAccessToken({ userId: user._id, companyId: company._id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user._id });

    // Store Refresh Token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt,
    });

    // Set Cookies
    setAuthCookies(res, accessToken, refreshToken);

    const userObj = user.toObject();
    delete userObj.password;

    return successResponse(
      res,
      {
        user: userObj,
        company,
        token: accessToken,
      },
      'Company registration successful',
      201
    );
  } catch (error) {
    console.error('Register Error:', error);
    return errorResponse(res, error.message || 'Registration failed', 500);
  }
};

export const login = async (req, res) => {
  try {
    await connectDB();
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Please provide email and password', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    if (user.status !== 'active') {
      return errorResponse(res, 'Account is deactivated. Please contact support.', 403);
    }

    let company = null;
    if (user.companyId) {
      company = await Company.findById(user.companyId);
      if (!company || company.status !== 'active') {
        return errorResponse(res, 'Company tenant is inactive or suspended', 403);
      }
    }

    user.lastLogin = new Date();
    await user.save();

    const accessToken = signAccessToken({ userId: user._id, companyId: user.companyId, role: user.role });
    const refreshToken = signRefreshToken({ userId: user._id });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt,
    });

    setAuthCookies(res, accessToken, refreshToken);

    const userObj = user.toObject();
    delete userObj.password;

    return successResponse(
      res,
      {
        user: userObj,
        company,
        token: accessToken,
      },
      'Login successful'
    );
  } catch (error) {
    console.error('Login Error:', error);
    return errorResponse(res, error.message || 'Login failed', 500);
  }
};

export const logout = async (req, res) => {
  try {
    if (req.user) {
      await RefreshToken.deleteMany({ userId: req.user._id });
    }
    clearAuthCookies(res);
    return successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    return errorResponse(res, 'Logout failed', 500);
  }
};

export const getMe = async (req, res) => {
  try {
    return successResponse(res, {
      user: req.user,
      company: req.company,
    });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch user profile', 500);
  }
};

export const socialLogin = async (req, res) => {
  try {
    await connectDB();
    const { provider, socialToken, email, name, avatar, socialId } = req.body;

    if (!email || !provider || !socialId) {
      return errorResponse(res, 'Email, provider and socialId are required', 400);
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Create new company and user for social login
      const companyName = name ? `${name}'s Workspace` : 'SyncChat Workspace';
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);
      
      const company = await Company.create({
        name: companyName,
        slug,
        email: email.toLowerCase(),
        status: 'active',
        plan: 'pro',
      });

      user = await User.create({
        companyId: company._id,
        name: name || 'User',
        email: email.toLowerCase(),
        avatar: avatar || '',
        role: ROLES.COMPANY_ADMIN,
        permissions: DEFAULT_ROLE_PERMISSIONS[ROLES.COMPANY_ADMIN],
        isGoogleAuth: provider === 'google',
        googleId: provider === 'google' ? socialId : null,
        isFacebookAuth: provider === 'facebook',
        facebookId: provider === 'facebook' ? socialId : null,
        status: 'active',
      });
    } else {
      if (provider === 'google') {
        user.isGoogleAuth = true;
        user.googleId = socialId;
      } else if (provider === 'facebook') {
        user.isFacebookAuth = true;
        user.facebookId = socialId;
      }
      if (avatar && !user.avatar) user.avatar = avatar;
      user.lastLogin = new Date();
      await user.save();
    }

    const company = await Company.findById(user.companyId);

    const accessToken = signAccessToken({ userId: user._id, companyId: user.companyId, role: user.role });
    const refreshToken = signRefreshToken({ userId: user._id });

    setAuthCookies(res, accessToken, refreshToken);

    return successResponse(res, {
      user,
      company,
      token: accessToken,
    }, `${provider} login successful`);
  } catch (error) {
    console.error('Social Login Error:', error);
    return errorResponse(res, 'Social login failed', 500);
  }
};
