import type { AdminRole, Permission } from '@/types/auth.types';

export const ADMIN_ROLES = [
  'owner',
  'manager',
  'reception',
] as const satisfies readonly AdminRole[];

export const PERMISSIONS = [
  'dashboard.view',
  'revenue.view',
  'reservations.view',
  'reservations.manage',
  'reservations.create',
  'reservations.edit_details',
  'reservations.reassign_room',
  'reservations.resend',
  'reservations.no_show',
  'reservations.discount',
  'reservations.change_dates',
  'reservations.cancel',
  'reservations.approve',
  'guest.contact.view',
  'calendar.view',
  'calendar.block',
  'blocks.restricted_reasons',
  'blocks.backdate',
  'enquiries.view',
  'enquiries.manage',
  'enquiries.anonymise',
  'rooms.view',
  'rooms.manage',
  'rates.manage',
  'extras.manage',
  'amenities.manage',
  'content.manage',
  'payments.view',
  'payments.manage',
  'payments.record',
  'payments.verify',
  'payments.refund',
  'settings.hotel.manage',
  'settings.payments.manage',
  'staff.manage',
  'audit.view',
] as const satisfies readonly Permission[];

const ownerPermissions = PERMISSIONS;
const managerPermissions = PERMISSIONS.filter(
  (permission) =>
    permission !== 'staff.manage' &&
    permission !== 'settings.payments.manage' &&
    permission !== 'enquiries.anonymise',
);
const receptionPermissions = [
  'dashboard.view',
  'reservations.view',
  'reservations.manage',
  'reservations.create',
  'reservations.edit_details',
  'reservations.reassign_room',
  'reservations.resend',
  'reservations.no_show',
  'guest.contact.view',
  'calendar.view',
  'calendar.block',
  'enquiries.view',
  'enquiries.manage',
  'enquiries.anonymise',
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
        label: 'Room types',
        permission: 'rooms.view',
      },
      {
        href: '/admin/rates',
        label: 'Rate rules',
        permission: 'rates.manage',
      },
      {
        href: '/admin/extras',
        label: 'Extras',
        permission: 'extras.manage',
      },
      {
        href: '/admin/amenities',
        label: 'Amenities',
        permission: 'amenities.manage',
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
      {
        href: '/admin/audit',
        label: 'Audit Log',
        permission: 'audit.view',
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
    title: 'Room types',
    description: 'Manage room types, individual units and photos.',
    permission: 'rooms.view',
  },
  rates: {
    title: 'Rate rules',
    description: 'Configure seasonal pricing, weekend rates and discounts.',
    permission: 'rates.manage',
  },
  extras: {
    title: 'Extras',
    description: 'Manage paid add-ons, pricing units and guest extras.',
    permission: 'extras.manage',
  },
  amenities: {
    title: 'Amenities',
    description: 'Manage room amenities catalogue and icons.',
    permission: 'amenities.manage',
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
  audit: {
    title: 'Audit Log',
    description: 'Review system events, compliance trails and staff actions.',
    permission: 'audit.view',
  },
};
