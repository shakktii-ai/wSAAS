import { withAuth } from '@/lib/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { mediaUrl, filename, type } = req.body;
      if (!mediaUrl) {
        return errorResponse(res, 'Media URL is required', 400);
      }
      return successResponse(res, {
        mediaUrl,
        filename: filename || 'attachment',
        type: type || 'document',
      }, 'Media uploaded successfully');
    } catch (error) {
      return errorResponse(res, 'Media upload failed', 500);
    }
  }
  res.setHeader('Allow', ['POST']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
