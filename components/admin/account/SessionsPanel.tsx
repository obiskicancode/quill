'use client';

import { LogOut, MonitorSmartphone, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { ServiceError } from '@/app/api/services/base.service';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminEmpty, AdminLoading } from '@/components/admin/AdminStates';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { FlowDialog } from '@/components/manage/FlowDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { formatDate } from '@/lib/dates';
import type { AdminSession } from '@/types/admin.types';

type DialogState =
  { type: 'one'; session: AdminSession } | { type: 'all' } | null;

export function SessionsPanel() {
  const [sessions, setSessions] = useState<AdminSession[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminService.getSessions();
      setSessions(result.data.sessions);
    } catch (caught) {
      setError(
        caught instanceof ServiceError
          ? caught.message
          : ERROR_MESSAGES.COULD_NOT_LOAD_SESSIONS,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    adminService
      .getSessions()
      .then((result) => {
        if (cancelled) return;
        setSessions(result.data.sessions);
        setLoading(false);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(
          caught instanceof ServiceError
            ? caught.message
            : ERROR_MESSAGES.COULD_NOT_LOAD_SESSIONS,
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmRevoke() {
    if (!dialog) return;
    setBusy(true);
    setError(null);
    try {
      const result =
        dialog.type === 'one'
          ? await adminService.revokeSession(dialog.session.id)
          : await adminService.revokeOtherSessions();
      const count = result.data.revoked;
      toast.add({
        title: SUCCESS_MESSAGES.SESSIONS_SIGNED_OUT(count),
        type: 'success',
      });
      setDialog(null);
      await load();
    } catch (caught) {
      setError(
        caught instanceof ServiceError
          ? caught.message
          : ERROR_MESSAGES.COULD_NOT_SIGN_OUT_SESSION,
      );
    } finally {
      setBusy(false);
    }
  }

  const hasOthers = sessions?.some((session) => !session.current) ?? false;

  return (
    <>
      <AdminCard
        title="Signed-in devices"
        description="Sessions last seven days. Sign out any device you do not recognise."
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
              loading={loading}
            >
              <RefreshCw className="size-4" aria-hidden />
              Refresh
            </Button>
            {hasOthers && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDialog({ type: 'all' })}
                icon={<LogOut className="size-4" aria-hidden />}
              >
                Sign out other devices
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          {error && <StatusBanner tone="error">{error}</StatusBanner>}

          {loading && !sessions ? (
            <AdminLoading label="Loading sessions" />
          ) : !sessions || sessions.length === 0 ? (
            <AdminEmpty title="No active sessions">
              Sign in again if you expected to see this device.
            </AdminEmpty>
          ) : (
            <ul className="divide-line rounded-control border-line divide-y border">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center"
                >
                  <span className="rounded-control bg-paper grid size-10 shrink-0 place-items-center">
                    <MonitorSmartphone className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-small flex flex-wrap items-center gap-2 font-semibold">
                      {deviceLabel(session.userAgent)}
                      {session.current && (
                        <Badge
                          variant="outline"
                          className="border-success/30 bg-success/10 text-caption text-success rounded-full px-2 py-0.5 font-semibold"
                        >
                          This device
                        </Badge>
                      )}
                    </p>
                    <p className="text-caption text-muted-foreground mt-0.5">
                      {session.ipAddress ?? 'Unknown IP'} · Last active{' '}
                      {formatDate(session.lastSeenAt)} · Expires{' '}
                      {formatDate(session.expiresAt)}
                    </p>
                  </div>
                  {!session.current && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setDialog({ type: 'one', session })}
                      className="self-start sm:self-auto"
                    >
                      Sign out
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </AdminCard>

      <FlowDialog
        open={dialog !== null}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
        title={
          dialog?.type === 'all'
            ? 'Sign out other devices?'
            : 'Sign out this device?'
        }
        dismissible={!busy}
      >
        <p className="text-small text-muted-foreground">
          {dialog?.type === 'all'
            ? 'Every other admin session will end immediately. Your current session stays active.'
            : 'That device will need to sign in again.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="danger"
            loading={busy}
            onClick={confirmRevoke}
            icon={<LogOut className="size-4" aria-hidden />}
          >
            Sign out
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => setDialog(null)}
          >
            Cancel
          </Button>
        </div>
      </FlowDialog>
    </>
  );
}

function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';
  if (/iphone/i.test(userAgent)) return 'iPhone';
  if (/ipad/i.test(userAgent)) return 'iPad';
  if (/android/i.test(userAgent)) return 'Android device';
  if (/macintosh|mac os/i.test(userAgent)) return 'Mac';
  if (/windows/i.test(userAgent)) return 'Windows device';
  if (/linux/i.test(userAgent)) return 'Linux device';
  return userAgent.slice(0, 60);
}
