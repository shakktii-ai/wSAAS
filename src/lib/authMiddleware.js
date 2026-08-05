import connectDB from './db';
import { verifyAccessToken } from './jwt';
import { errorResponse } from './apiResponse';
import User from '@/models/User';
import Company from '@/models/Company';

export function withAuth(handler, options = {}) {
  return async (req, res) => {
    try {
      await connectDB();

      // Extract token from Cookie or Authorization Header
      let token = null;
      
      // Cookie parsing
      if (req.headers.cookie) {
        const cookies = Object.fromEntries(
          req.headers.cookie.split('; ').map((c) => {
            const [k, ...v] = c.split('=');
            return [k, v.join('=')];
          })
        );
        token = cookies['syncchat_token'];
      }

      // Fallback to Bearer Header
      if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (!token) {
        return errorResponse(res, 'Authentication token missing', 401);
      }

      const decoded = verifyAccessToken(token);
      if (!decoded) {
        return errorResponse(res, 'Invalid or expired access token', 401);
      }

      // Fetch User
      const user = await User.findById(decoded.userId).select('-password');
      if (!user || user.status !== 'active') {
        return errorResponse(res, 'User not found or account deactivated', 401);
      }

      // Fetch Company if tenant user
      let company = null;
      if (user.companyId) {
        company = await Company.findById(user.companyId);
        if (!company || company.status !== 'active') {
          return errorResponse(res, 'Company tenant is inactive or suspended', 403);
        }
      }

      // Attach context to req
      req.user = user;
      req.company = company;

      // Role check if specified
      if (options.roles && options.roles.length > 0) {
        if (!options.roles.includes(user.role)) {
          return errorResponse(res, 'Permission denied: Insufficient role level', 403);
        }
      }

      // Required Permission check if specified
      if (options.requiredPermission) {
        const userPermissions = user.permissions || [];
        const isSuperAdmin = user.role === 'SUPER_ADMIN';
        const isCompanyAdmin = user.role === 'COMPANY_ADMIN';

        if (!isSuperAdmin && !isCompanyAdmin && !userPermissions.includes(options.requiredPermission)) {
          return errorResponse(res, `Permission denied: Missing '${options.requiredPermission}'`, 403);
        }
      }

      return handler(req, res);
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      return errorResponse(res, 'Authentication server error', 500);
    }
  };
}
