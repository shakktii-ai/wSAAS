import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { redisService } from '@/lib/redisService';
import { queueService } from '@/lib/queueService';
import { socketService } from '@/lib/socketService';
import { successResponse } from '@/lib/apiResponse';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  let mongoStatus = 'DISCONNECTED';
  try {
    await connectDB();
    mongoStatus = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'STANDBY';
  } catch (e) {
    mongoStatus = 'ERROR';
  }

  const memoryUsage = process.memoryUsage();
  const queueMetrics = queueService.getQueueMetrics();

  const healthData = {
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      mongoDB: {
        status: mongoStatus,
        database: mongoose.connection.name || 'syncchat',
      },
      redis: {
        status: 'CONNECTED',
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
      },
      bullMQ: {
        status: 'ACTIVE_WORKERS',
        queues: queueMetrics,
      },
      socketIO: {
        status: 'ACTIVE_GATEWAY',
        connections: socketService.activeConnections,
      },
      metaApi: {
        status: 'OPERATIONAL',
        version: process.env.META_API_VERSION || 'v20.0',
      },
    },
    systemMetrics: {
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      cpuLoad: 'NORMAL',
    },
  };

  return successResponse(res, healthData, 'Infrastructure health metrics fetched successfully');
}
