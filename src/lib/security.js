/**
 * Rate Limiter Memory Store for API Protection
 */
const rateLimitMap = new Map();

export function rateLimiter(req, res, { windowMs = 60 * 1000, maxRequests = 100 } = {}) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const record = rateLimitMap.get(ip);
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return true;
  }

  record.count += 1;
  if (record.count > maxRequests) {
    res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
    res.status(429).json({
      success: false,
      message: 'Too Many Requests - Rate Limit Exceeded. Please try again later.',
    });
    return false;
  }

  return true;
}

/**
 * Apply Production Security Headers (Helmet Equivalents)
 */
export function applySecurityHeaders(res) {
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

/**
 * CORS Configuration Setter
 */
export function applyCorsHeaders(req, res) {
  const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}
