import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_syncchat_enterprise_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_syncchat_enterprise_2026';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const signAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const signRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = [
    `syncchat_token=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${isProd ? '; Secure' : ''}`,
    `syncchat_refresh=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${isProd ? '; Secure' : ''}`
  ];
  
  if (typeof res.setHeader === 'function') {
    res.setHeader('Set-Cookie', cookieOptions);
  }
};

export const clearAuthCookies = (res) => {
  const cookieOptions = [
    `syncchat_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    `syncchat_refresh=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  ];
  
  if (typeof res.setHeader === 'function') {
    res.setHeader('Set-Cookie', cookieOptions);
  }
};
