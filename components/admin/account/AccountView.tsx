'use client';

import {
  KeyRound,
  MonitorSmartphone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';

import { PasswordPanel } from '@/components/admin/account/PasswordPanel';
import { ProfilePanel } from '@/components/admin/account/ProfilePanel';
import { SessionsPanel } from '@/components/admin/account/SessionsPanel';
import { TwoFactorPanel } from '@/components/admin/account/TwoFactorPanel';
import { StatusBanner } from '@/components/admin/StatusBanner';
import type { AdminRole } from '@/lib/auth/permissions';
import type { AdminStaff } from '@/types/admin.types';

export type AccountTab = 'profile' | 'password' | 'two-factor' | 'sessions';

const tabs = [
  {
    id: 'profile' as const,
    label: 'Profile',
    icon: UserRound,
  },
  {
    id: 'password' as const,
    label: 'Password',
    icon: KeyRound,
  },
  {
    id: 'two-factor' as const,
    label: 'Two-factor',
    icon: ShieldCheck,
  },
  {
    id: 'sessions' as const,
    label: 'Devices',
    icon: MonitorSmartphone,
  },
];

export function AccountView({
  staff,
  role,
  mfaPending,
  initialTab,
}: {
  staff: AdminStaff;
  role: AdminRole;
  mfaPending: boolean;
  initialTab: AccountTab;
}) {
  const [pending, setPending] = useState(mfaPending);
  const [tab, setTab] = useState<AccountTab>(
    mfaPending ? 'two-factor' : initialTab,
  );

  const visibleTabs = pending
    ? tabs.filter((item) => item.id === 'two-factor')
    : tabs;
  const activeTab = pending ? 'two-factor' : tab;

  return (
    <div className="space-y-4">
      {pending && (
        <StatusBanner tone="error">
          Finish two-factor setup before using the rest of the admin.
        </StatusBanner>
      )}

      <div
        role="tablist"
        aria-label="Account settings"
        className="flex gap-1 overflow-x-auto rounded-control border border-line bg-surface p-1"
      >
        {visibleTabs.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`account-tab-${item.id}`}
              aria-selected={active}
              aria-controls={`account-panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`flex min-h-10 shrink-0 items-center gap-2 rounded-control px-3 text-small font-semibold ${
                active
                  ? 'bg-ink text-paper'
                  : 'text-muted hover:bg-ink/5 hover:text-ink'
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`account-panel-${activeTab}`}
        aria-labelledby={`account-tab-${activeTab}`}
      >
        {activeTab === 'profile' && <ProfilePanel staff={staff} />}
        {activeTab === 'password' && <PasswordPanel />}
        {activeTab === 'two-factor' && (
          <TwoFactorPanel
            enabled={staff.mfaEnabled}
            role={role}
            pending={pending}
            onEnabledChange={(enabled) => {
              if (enabled) setPending(false);
            }}
          />
        )}
        {activeTab === 'sessions' && <SessionsPanel />}
      </div>
    </div>
  );
}
