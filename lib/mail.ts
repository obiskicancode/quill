import { config } from '@/config';
import type { StaffUser } from '@/db/types';
import { createNotificationLog } from '@/lib/db/repositories/notifications.repo';

interface PasswordResetEmail {
  staff: StaffUser;
  token: string;
  expiresAt: Date;
}

export async function sendAdminPasswordResetEmail({
  staff,
  token,
  expiresAt,
}: PasswordResetEmail): Promise<void> {
  const resetUrl = `${config.SITE.URL.replace(/\/$/, '')}/admin/reset-password/${token}`;

  if (config.isDev) {
    console.info('\nAdmin password reset');
    console.info(`Email: ${staff.email}`);
    console.info(`Link:  ${resetUrl}`);
    console.info(`Expires: ${expiresAt.toISOString()}\n`);
  }

  try {
    await createNotificationLog({
      templateKey: 'admin_password_reset',
      channel: 'email',
      recipient: staff.email,
      subject: 'Reset your admin password',
      body: `A password reset was requested for ${staff.firstName}. This link expires in 60 minutes.`,
      status: 'queued',
    });
  } catch (error) {
    console.error('Could not record password reset notification', {
      staffId: staff.id,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}
