'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ExternalLink,
  History,
  KeyRound,
  LogOut,
  Mail,
  ShieldAlert,
  Smartphone,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { ServiceError } from '@/app/api/services/base.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useDeactivateStaff,
  useReactivateStaff,
  useResendStaffInvite,
  useResetStaff2FA,
  useRevokeStaffSessions,
  useSendStaffPasswordReset,
  useUnlockStaff,
  useUpdateStaff,
} from '@/hooks/services/admin/use-staff';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { StaffUpdateInputSchema } from '@/schemas/staff-admin.schema';
import type { StaffDetailResponse } from '@/types/staff-admin.types';

const ROLE_OPTIONS = [
  { value: 'reception', label: 'Reception' },
  { value: 'manager', label: 'Manager' },
  { value: 'owner', label: 'Owner' },
];

const StaffProfileFormSchema = StaffUpdateInputSchema.omit({ version: true });

type ProfileInput = z.input<typeof StaffProfileFormSchema>;
type ProfileOutput = z.output<typeof StaffProfileFormSchema>;

export function StaffDetailSheet({
  staff,
  onClose,
  onReload,
  onRequestStepUp,
}: {
  staff: StaffDetailResponse | null;
  onClose: () => void;
  onReload: () => Promise<void>;
  onRequestStepUp: (onVerified: () => void) => void;
}) {
  const updateStaff = useUpdateStaff();
  const resendStaffInvite = useResendStaffInvite();
  const unlockStaff = useUnlockStaff();
  const sendStaffPasswordReset = useSendStaffPasswordReset();
  const revokeStaffSessions = useRevokeStaffSessions();
  const resetStaff2FA = useResetStaff2FA();
  const deactivateStaff = useDeactivateStaff();
  const reactivateStaff = useReactivateStaff();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);

  const form = useForm<ProfileInput, unknown, ProfileOutput>({
    resolver: zodResolver(StaffProfileFormSchema),
    defaultValues: {
      firstName: staff?.firstName || '',
      lastName: staff?.lastName || '',
      phone: staff?.phone || '',
      role: staff?.role || 'reception',
    },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError: setFieldError,
  } = form;

  useEffect(() => {
    if (!staff) return;
    reset({
      firstName: staff.firstName,
      lastName: staff.lastName,
      phone: staff.phone || '',
      role: staff.role,
    });
  }, [staff, reset]);

  if (!staff) return null;

  const busy = isSubmitting || updateStaff.isPending;

  const handleSaveProfile = async (input: ProfileOutput) => {
    const isRoleChange = input.role !== staff.role;

    const performSave = async (values: ProfileOutput) => {
      try {
        setMessage(null);
        const res = await updateStaff.mutateAsync({
          id: staff.id,
          body: { ...values, version: staff.updatedAt },
        });
        if (res.success) {
          toast.add({
            title: SUCCESS_MESSAGES.STAFF_PROFILE_UPDATED,
            type: 'success',
          });
          await onReload();
        } else {
          setMessage({
            text: res.message || ERROR_MESSAGES.FAILED_TO_UPDATE_STAFF_PROFILE,
            isError: true,
          });
        }
      } catch (caught: unknown) {
        if (
          caught instanceof ServiceError &&
          caught.body?.code === ERROR_CODES.STEP_UP_REQUIRED
        ) {
          onRequestStepUp(() => performSave(values));
          return;
        }
        setMessage({
          text:
            caught instanceof ServiceError
              ? caught.message
              : caught instanceof Error
                ? caught.message
                : ERROR_MESSAGES.FAILED_TO_UPDATE_STAFF_PROFILE,
          isError: true,
        });
        if (caught instanceof ServiceError) {
          applyServerFieldErrors(setFieldError, caught);
        }
      }
    };

    if (isRoleChange) {
      onRequestStepUp(() => performSave(input));
    } else {
      await performSave(input);
    }
  };

  const handleAction = async (
    actionName: string,
    actionFn: () => Promise<{ success: boolean; message: string }>,
    needsStepUp = false,
  ) => {
    const execute = async () => {
      try {
        setActionLoading(actionName);
        setMessage(null);
        const res = await actionFn();
        if (res.success) {
          toast.add({
            title: res.message || SUCCESS_MESSAGES.ACTION_COMPLETED,
            type: 'success',
          });
          await onReload();
        } else {
          setMessage({
            text: res.message || ERROR_MESSAGES.FAILED_TO_COMPLETE_ACTION,
            isError: true,
          });
        }
      } catch (caught: unknown) {
        if (
          caught instanceof ServiceError &&
          caught.body?.code === ERROR_CODES.STEP_UP_REQUIRED
        ) {
          onRequestStepUp(() => execute());
          return;
        }
        setMessage({
          text:
            caught instanceof ServiceError
              ? caught.message
              : caught instanceof Error
                ? caught.message
                : ERROR_MESSAGES.FAILED_TO_COMPLETE_ACTION,
          isError: true,
        });
      } finally {
        setActionLoading(null);
      }
    };

    if (needsStepUp) {
      onRequestStepUp(() => execute());
    } else {
      await execute();
    }
  };

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton
        className="border-line bg-card w-full max-w-2xl gap-0 border-l p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-line flex-row items-center gap-3 border-b px-6 py-4 pr-14">
          <div className="bg-primary/10 text-brand-ink flex size-10 items-center justify-center rounded-full font-bold">
            {staff.firstName[0]}
            {staff.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <SheetTitle className="text-h3 font-display text-ink font-semibold">
                {staff.fullName}
              </SheetTitle>
              <Badge
                variant="outline"
                className={`text-caption rounded-full px-2 py-0.5 font-semibold capitalize ${
                  staff.status === 'active'
                    ? 'border-success/20 bg-success/10 text-success'
                    : staff.status === 'invited'
                      ? 'border-primary/20 bg-primary/10 text-brand-ink'
                      : staff.status === 'locked'
                        ? 'border-destructive/20 bg-destructive/10 text-destructive'
                        : 'border-muted/20 bg-muted/10 text-muted-foreground'
                }`}
              >
                {staff.status}
              </Badge>
            </div>
            <SheetDescription className="text-caption text-muted-foreground">
              {staff.email}
            </SheetDescription>
          </div>
        </SheetHeader>

        {/* Content Body */}
        <div className="text-small flex-1 space-y-6 overflow-y-auto p-6">
          {message && (
            <div
              className={`text-caption rounded-lg border p-3 font-medium ${
                message.isError
                  ? 'border-destructive/30 bg-destructive/5 text-destructive'
                  : 'border-success/30 bg-success/5 text-success'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Edit Form */}
          <form
            onSubmit={handleSubmit(handleSaveProfile)}
            className="border-line bg-paper/30 space-y-4 rounded-lg border p-4"
            noValidate
          >
            <h3 className="text-ink font-semibold">Account Profile</h3>

            <div className="grid grid-cols-2 gap-3">
              <Field
                id="staff-first-name"
                label="First Name"
                error={errors.firstName?.message}
              >
                {(a11y) => (
                  <Input
                    {...a11y}
                    {...register('firstName')}
                    type="text"
                    required
                    className={inputClass(errors.firstName?.message)}
                  />
                )}
              </Field>
              <Field
                id="staff-last-name"
                label="Last Name"
                error={errors.lastName?.message}
              >
                {(a11y) => (
                  <Input
                    {...a11y}
                    {...register('lastName')}
                    type="text"
                    required
                    className={inputClass(errors.lastName?.message)}
                  />
                )}
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field id="staff-role" label="Role" error={errors.role?.message}>
                {(a11y) => (
                  <Controller
                    control={control}
                    name="role"
                    render={({ field }) => (
                      <Select
                        items={ROLE_OPTIONS}
                        value={field.value}
                        onValueChange={(val) => {
                          if (val) field.onChange(val);
                        }}
                      >
                        <SelectTrigger
                          id={a11y.id}
                          aria-describedby={a11y['aria-describedby']}
                          aria-invalid={a11y['aria-invalid']}
                          onBlur={field.onBlur}
                          className={`${inputClass(errors.role?.message)} w-full`}
                        >
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Field>
              <Field
                id="staff-phone"
                label="Phone Number"
                error={errors.phone?.message}
              >
                {(a11y) => (
                  <Input
                    {...a11y}
                    {...register('phone')}
                    type="tel"
                    className={inputClass(errors.phone?.message)}
                  />
                )}
              </Field>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={busy}>
                Save Changes
              </Button>
            </div>
          </form>

          {/* Quick Security Actions */}
          <div className="border-line space-y-3 rounded-lg border p-4">
            <h3 className="text-ink font-semibold">
              Administrative & Security Actions
            </h3>
            <div className="text-caption grid grid-cols-1 gap-2 sm:grid-cols-2">
              {/* Resend invite (invited accounts only) */}
              {staff.status === 'invited' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleAction('resend', () =>
                      resendStaffInvite.mutateAsync(staff.id),
                    )
                  }
                  loading={actionLoading === 'resend'}
                  className="h-auto justify-start py-2"
                >
                  <Mail className="text-primary size-4" />
                  <span>Resend Invitation Email</span>
                </Button>
              )}

              {/* Unlock if locked */}
              {staff.status === 'locked' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleAction('unlock', () =>
                      unlockStaff.mutateAsync(staff.id),
                    )
                  }
                  loading={actionLoading === 'unlock'}
                  className="h-auto justify-start py-2"
                >
                  <UserCheck className="text-success size-4" />
                  <span>Unlock Account</span>
                </Button>
              )}

              {/* Password reset email */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  handleAction('reset_pwd', () =>
                    sendStaffPasswordReset.mutateAsync(staff.id),
                  )
                }
                loading={actionLoading === 'reset_pwd'}
                className="h-auto justify-start py-2"
              >
                <KeyRound className="text-muted-foreground size-4" />
                <span>Send Password Reset</span>
              </Button>

              {/* Sign out of all sessions */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  handleAction('revoke_sess', () =>
                    revokeStaffSessions.mutateAsync(staff.id),
                  )
                }
                loading={actionLoading === 'revoke_sess'}
                className="h-auto justify-start py-2"
              >
                <LogOut className="text-warning size-4" />
                <span>Revoke All Sessions</span>
              </Button>

              {/* Reset 2FA (Step-up required) */}
              {staff.mfaEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleAction(
                      'reset_2fa',
                      () => resetStaff2FA.mutateAsync(staff.id),
                      true,
                    )
                  }
                  loading={actionLoading === 'reset_2fa'}
                  className="h-auto justify-start py-2"
                >
                  <ShieldAlert className="text-destructive size-4" />
                  <span>Reset 2FA</span>
                </Button>
              )}

              {/* Deactivate / Reactivate (Step-up required for deactivation) */}
              {staff.status !== 'deactivated' ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    handleAction(
                      'deactivate',
                      () => deactivateStaff.mutateAsync(staff.id),
                      true,
                    )
                  }
                  loading={actionLoading === 'deactivate'}
                  className="h-auto justify-start py-2"
                >
                  <UserX className="size-4" />
                  <span>Deactivate Account</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleAction('reactivate', () =>
                      reactivateStaff.mutateAsync(staff.id),
                    )
                  }
                  loading={actionLoading === 'reactivate'}
                  className="text-success hover:text-success border-success/30 hover:bg-success/10 h-auto justify-start py-2"
                >
                  <UserCheck className="size-4" />
                  <span>Reactivate Account</span>
                </Button>
              )}
            </div>
          </div>

          {/* Active Sessions */}
          <div className="border-line space-y-3 rounded-lg border p-4">
            <h3 className="text-ink flex items-center gap-1.5 font-semibold">
              <Smartphone className="text-muted-foreground size-4" /> Active
              Sessions
            </h3>
            {staff.activeSessions.length === 0 ? (
              <p className="text-caption text-muted-foreground">
                No active sessions.
              </p>
            ) : (
              <div className="divide-line divide-y">
                {staff.activeSessions.map((s) => (
                  <div
                    key={s.id}
                    className="text-caption flex items-center justify-between py-2"
                  >
                    <div>
                      <div className="text-ink font-medium">
                        {s.deviceLabel}
                      </div>
                      <div className="text-muted-foreground text-[0.6875rem]">
                        IP: {s.ipAddress || 'unknown'} • Created:{' '}
                        {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="text-muted-foreground text-[0.6875rem]">
                      {s.lastSeenAt
                        ? `Active ${new Date(s.lastSeenAt).toLocaleTimeString()}`
                        : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Audit Entries */}
          <div className="border-line space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-ink flex items-center gap-1.5 font-semibold">
                <History className="text-muted-foreground size-4" />
                Recent Audit Entries
              </h3>
              <Link
                href={`/admin/audit?q=${encodeURIComponent(staff.email)}`}
                className="text-caption text-primary flex items-center gap-1 font-semibold hover:underline"
              >
                Full Audit Log <ExternalLink className="size-3" />
              </Link>
            </div>
            {staff.recentAudits.length === 0 ? (
              <p className="text-caption text-muted-foreground">
                No recent audit events recorded for this user.
              </p>
            ) : (
              <div className="divide-line divide-y">
                {staff.recentAudits.map((a) => (
                  <div key={a.id} className="text-caption space-y-0.5 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-ink font-mono font-medium capitalize">
                        {a.action} ({a.entity})
                      </span>
                      <span className="text-muted-foreground text-[0.6875rem]">
                        {new Date(a.createdAt).toLocaleString('en-GB')}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-[0.6875rem]">
                      {a.summary}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
