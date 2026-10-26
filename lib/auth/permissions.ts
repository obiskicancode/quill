export const ADMIN_ROLES = ['owner', 'manager', 'reception'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const PERMISSIONS = [
  'dashboard.view',
  'reservations.view',
  'reservations.manage',
  'calendar.view',
  'calendar.block',
  'enquiries.view',
  'enquiries.manage',
  'rooms.view',
  'rooms.manage',
  'rates.manage',
  'content.manage',
  'payments.view',
  'payments.manage',
  'settings.hotel.manage',
  'settings.payments.manage',
  'staff.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ownerPermissions = PERMISSIONS;
const managerPermissions = PERMISSIONS.filter(
  (permission) =>
    permission !== 'staff.manage' && permission !== 'settings.payments.manage',
);
const receptionPermissions = [
  'dashboard.view',
  'reservations.view',
  'reservations.manage',
  'calendar.view',
  'calendar.block',
  'enquiries.view',
  'enquiries.manage',
] as const satisfies readonly Permission[];

export const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  owner: ownerPermissions,
  manager: managerPermissions,
  reception: receptionPermissions,
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  reception: 'Reception',
};

export function can(
  role: AdminRole,
  permission: Permission | undefined,
): boolean {
  if (!permission) return true;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export interface AdminNavItem {
  href: string;
  label: string;
  permission: Permission;
}

export interface AdminNavGroup {
  label: string;
  items: readonly AdminNavItem[];
}

export const ADMIN_NAV: readonly AdminNavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', permission: 'dashboard.view' },
    ],
  },
  {
    label: 'Front desk',
    items: [
      {
        href: '/admin/reservations',
        label: 'Reservations',
        permission: 'reservations.view',
      },
      {
        href: '/admin/calendar',
        label: 'Calendar',
        permission: 'calendar.view',
      },
      {
        href: '/admin/enquiries',
        label: 'Enquiries',
        permission: 'enquiries.view',
      },
    ],
  },
  {
    label: 'Property',
    items: [
      {
        href: '/admin/rooms',
        label: 'Rooms and rates',
        permission: 'rooms.view',
      },
      {
        href: '/admin/content',
        label: 'Content',
        permission: 'content.manage',
      },
      {
        href: '/admin/payments',
        label: 'Payments',
        permission: 'payments.view',
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        href: '/admin/settings',
        label: 'Settings',
        permission: 'settings.hotel.manage',
      },
      {
        href: '/admin/staff',
        label: 'Staff',
        permission: 'staff.manage',
      },
    ],
  },
];

export interface AdminSection {
  title: string;
  description: string;
  permission: Permission;
}

export const ADMIN_SECTIONS: Record<string, AdminSection> = {
  reservations: {
    title: 'Reservations',
    description: 'Manage arrivals, departures and booking changes.',
    permission: 'reservations.view',
  },
  calendar: {
    title: 'Availability calendar',
    description: 'See availability and block rooms when needed.',
    permission: 'calendar.view',
  },
  enquiries: {
    title: 'Enquiries',
    description: 'Reply to guest questions and booking requests.',
    permission: 'enquiries.view',
  },
  rooms: {
    title: 'Rooms and rates',
    description: 'Manage room types, rooms and nightly pricing.',
    permission: 'rooms.view',
  },
  content: {
    title: 'Content',
    description: 'Edit the public website content and images.',
    permission: 'content.manage',
  },
  payments: {
    title: 'Payments',
    description: 'Review payments, refunds and transfer proofs.',
    permission: 'payments.view',
  },
  settings: {
    title: 'Settings',
    description: 'Update hotel details, policies and site settings.',
    permission: 'settings.hotel.manage',
  },
  staff: {
    title: 'Staff',
    description: 'Invite staff and manage roles and access.',
    permission: 'staff.manage',
  },
};
