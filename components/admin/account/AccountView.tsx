'use client';

import { useState } from 'react';

import { PasswordPanel } from '@/components/admin/account/PasswordPanel';
import { ProfilePanel } from '@/components/admin/account/ProfilePanel';
import { SessionsPanel } from '@/components/admin/account/SessionsPanel';
import { TwoFactorPanel } from '@/components/admin/account/TwoFactorPanel';
import { StatusBanner } from '@/components/admin/StatusBanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AdminRole } from '@/types/auth.types';
import type { Staff } from '@/types/staff.types';

export type AccountTab = 'profile' | 'password' | 'two-factor' | 'sessions';

const tabs = [
  { id: 'profile' as const, label: 'Profile' },
  { id: 'password' as const, label: 'Password' },
  { id: 'two-factor' as const, label: 'Two-factor' },
  { id: 'sessions' as const, label: 'Devices' },
];

/**
 * Account settings tabs. Owners with MFA pending are locked to the two-factor
 * tab until setup is complete.
 */
export function AccountView({
  staff,
  role,
  mfaPending,
  initialTab,
}: {
  staff: Staff;
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
          Owners must set up two-factor authentication before opening the
          dashboard.
        </StatusBanner>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(val) => setTab(val as AccountTab)}
        className="w-full space-y-4"
      >
        <div className="border-b border-line pb-2">
          <TabsList
            variant="line"
            className="h-auto max-w-full gap-1 p-0 sm:gap-2"
          >
            {visibleTabs.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className="px-1 pb-2 text-caption font-semibold sm:px-2.5 sm:text-small"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="profile">
          <ProfilePanel staff={staff} />
        </TabsContent>
        <TabsContent value="password">
          <PasswordPanel />
        </TabsContent>
        <TabsContent value="two-factor">
          <TwoFactorPanel
            enabled={staff.mfaEnabled}
            role={role}
            pending={pending}
            onEnabledChange={(enabled) => {
              if (enabled) setPending(false);
            }}
          />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
