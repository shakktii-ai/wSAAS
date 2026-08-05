import { socialLogin } from '@/controllers/authController';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return socialLogin(req, res);
  }
  res.setHeader('Allow', ['POST']);
  return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
}
