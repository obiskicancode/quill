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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AdminStaff } from '@/types/admin.types';
import type { AdminRole } from '@/types/auth.types';

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

      <Tabs
        value={activeTab}
        onValueChange={(val) => setTab(val as AccountTab)}
        className="w-full space-y-4"
      >
        <TabsList className="border-line bg-card flex h-auto w-full justify-start gap-1 overflow-x-auto border p-1">
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className="gap-2 px-3 py-2 text-sm font-semibold"
              >
                <Icon className="size-4" aria-hidden />
                {item.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

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
