import { PartnerNotification } from '../db/models/index.js';
import { PartnerNotificationType } from '@menuar/types';

export async function createPartnerNotification(
  partnerId: string,
  type: PartnerNotificationType,
  title: string,
  message: string,
  data?: any
) {
  try {
    const notification = await PartnerNotification.create({
      partnerId,
      type,
      title,
      message,
      data,
    });

    const io = (global as any).io;
    if (io) {
      io.to(`partner:${partnerId}`).emit('partner:notification', {
        id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });
    }
  } catch (err) {
    console.error(`Failed to create partner notification for ${partnerId}:`, err);
  }
}

export function emitAdminEvent(event: string, payload: any) {
  const io = (global as any).io;
  if (io) {
    io.to('admin').emit(event, payload);
  }
}
