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

export interface StaffInvitationEmail {
  staff: Pick<StaffUser, 'id' | 'email' | 'firstName' | 'role'>;
  token: string;
  expiresAt: Date;
  invitedByName: string;
  invitedByEmail?: string;
}

export async function sendStaffInvitationEmail({
  staff,
  token,
  expiresAt,
  invitedByName,
}: StaffInvitationEmail): Promise<void> {
  const inviteUrl = `${config.SITE.URL.replace(/\/$/, '')}/admin/reset-password/${token}?invite=1`;

  if (config.isDev) {
    console.info('\nStaff invitation email:');
    console.info(`To:      ${staff.email}`);
    console.info(`Role:    ${staff.role}`);
    console.info(`Invited: by ${invitedByName}`);
    console.info(`Link:    ${inviteUrl}`);
    console.info(`Expires: ${expiresAt.toISOString()}\n`);
  }

  try {
    await createNotificationLog({
      templateKey: 'staff_invitation',
      channel: 'email',
      recipient: staff.email,
      subject: `You have been invited to Dela Hotel Admin (${staff.role})`,
      body: `Hello ${staff.firstName},\n\n${invitedByName} has invited you to join the Dela Hotel management team as a ${staff.role}.\n\nPlease set your password and enrol in 2FA using this link:\n${inviteUrl}\n\nThis invitation link expires in 72 hours.`,
      status: 'queued',
    });
  } catch (error) {
    console.error('Could not record staff invitation notification', {
      email: staff.email,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}

export interface SecurityAlertEmail {
  toOwnerEmails: string[];
  action: string;
  targetStaffName: string;
  actorName: string;
  ipAddress?: string | null;
}

export async function sendSecurityAlertEmail({
  toOwnerEmails,
  action,
  targetStaffName,
  actorName,
  ipAddress,
}: SecurityAlertEmail): Promise<void> {
  const timestamp = new Date().toISOString();

  if (config.isDev) {
    console.info('\n[SECURITY ALERT EMAIL TO OWNERS]');
    console.info(`Recipients: ${toOwnerEmails.join(', ')}`);
    console.info(`Action:     ${action}`);
    console.info(`Target:     ${targetStaffName}`);
    console.info(`Actor:      ${actorName} (${ipAddress || 'unknown IP'})`);
    console.info(`Time:       ${timestamp}\n`);
  }

  for (const recipient of toOwnerEmails) {
    try {
      await createNotificationLog({
        templateKey: 'security_alert',
        channel: 'email',
        recipient,
        subject: `Security Alert: ${action} on ${targetStaffName}`,
        body: `A sensitive security action was executed:\n\nAction: ${action}\nTarget: ${targetStaffName}\nPerformed by: ${actorName}\nIP Address: ${ipAddress || 'unknown'}\nTimestamp: ${timestamp}`,
        status: 'queued',
      });
    } catch (error) {
      console.error('Could not queue security alert email', {
        recipient,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }
}

export interface RefundIssuedEmail {
  reservationReference: string;
  guestEmail: string;
  guestName: string;
  amountMinor: number;
  method: string;
  reference: string;
  note?: string;
}

export async function sendRefundIssuedEmail({
  reservationReference,
  guestEmail,
  guestName,
  amountMinor,
  method,
  reference,
  note,
}: RefundIssuedEmail): Promise<void> {
  const formattedAmount = `₦${(amountMinor / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  if (config.isDev) {
    console.info('\n[REFUND ISSUED EMAIL]');
    console.info(`To:        ${guestEmail} (${guestName})`);
    console.info(`Booking:   ${reservationReference}`);
    console.info(`Amount:    ${formattedAmount}`);
    console.info(`Method:    ${method} (Ref: ${reference})\n`);
  }

  try {
    await createNotificationLog({
      templateKey: 'refund_issued',
      channel: 'email',
      recipient: guestEmail,
      subject: `Refund processed for booking ${reservationReference}`,
      body: `Dear ${guestName},\n\nA refund of ${formattedAmount} has been processed for your booking ${reservationReference} via ${method} (Reference: ${reference}).\n\n${note ? `Note: ${note}\n\n` : ''}Thank you for your patience.`,
      status: 'queued',
    });
  } catch (error) {
    console.error('Could not queue refund issued email', {
      guestEmail,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}
