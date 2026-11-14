import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import {
  amenities,
  hotelSettings,
  notificationRecipients,
  notificationTemplates,
  sitePages,
} from '@/db/schema';
import type { NewSitePage } from '@/db/types';
import { runOwnerSeed } from '@/scripts/seed/lib/create-owner';
import fixtures from '@/scripts/seed/lib/fixtures.json';

import { requiredEnv } from './args';
import { DEFAULT_NOTIFICATION_TEMPLATES } from './notification-templates';
import type { SeedExecutor } from './seed-records';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

const f = fixtures as AnyRecord;

const PAGE_SLUGS = [
  'home',
  'about',
  'gallery',
  'amenities',
  'contact',
  'terms',
  'privacy',
  'cancellation-policy',
  'house-rules',
] as const;

const LEGAL_SLUGS = new Set([
  'terms',
  'privacy',
  'cancellation-policy',
  'house-rules',
]);

function addressLine(address: AnyRecord): string {
  return [
    address.line1,
    address.area,
    address.city,
    address.state,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}

function settingsValues(now: Date) {
  const site = f.site as AnyRecord;
  const content = f.contentSettings as AnyRecord;
  const room = f.roomSettings as AnyRecord;
  const checkout = f.checkout as AnyRecord;
  const policy = f.policySettings as AnyRecord;
  const cancellation = policy.cancellation as AnyRecord;
  const rules = policy.houseRules as AnyRecord;
  const address = content.address as AnyRecord;
  const publicEmail = content.publicEmail ?? site.contact?.email ?? null;
  const publicPhones = (content.publicPhones ?? []).map(
    (phone: AnyRecord) => phone.display ?? phone.tel,
  );

  return {
    id: 1,
    displayName: site.name,
    legalName: content.legalName ?? content.displayName ?? site.name,
    tagline: content.tagline ?? site.description ?? null,
    propertyType: 'hotel',
    description: site.description ?? null,
    heroTitle: site.hero?.headline ?? null,
    heroSubtitle: site.hero?.subheadline ?? null,
    heroImageUrl: site.hero?.image?.src ?? null,
    heroImageAlt: site.hero?.image?.alt ?? null,
    address: addressLine(address),
    city: address.city ?? 'Lagos',
    state: address.state ?? null,
    country: 'NG',
    latitude: content.latitude ?? null,
    longitude: content.longitude ?? null,
    googleMapsUrl: content.googleMapsUrl ?? null,
    googleMapsEmbedUrl: content.googleMapsEmbedUrl ?? null,
    directionsText: content.directionsText ?? null,
    nearestAirportNote: content.nearestAirportNote ?? null,
    publicPhones,
    whatsappNumber:
      content.whatsappNumber ?? site.contact?.whatsappNumber ?? null,
    whatsappPrefillMessage:
      content.whatsappPrefillMessage ??
      site.contact?.whatsappMessage ??
      'Hello, I would like to enquire about a room.',
    publicEmail,
    contactFormRecipient: content.contactFormRecipient ?? publicEmail ?? null,
    receptionHours: content.receptionHours ?? site.reception ?? null,
    googleReviewsUrl: content.googleReviewsUrl ?? null,
    enquiryResponseHours: content.enquiryResponseHours ?? 24,
    timezone: room.timeZone ?? 'Africa/Lagos',
    checkInTime: checkout.checkInTime24 ?? '14:00',
    checkOutTime: '12:00',
    cancellationPolicyType: cancellation.policyType ?? 'moderate',
    freeCancellationHours: room.freeCancellationHours ?? 48,
    afterDeadlineRule: {
      kind: 'percent',
      value: cancellation.refundPercentAfterWindow ?? 0,
    },
    depositBps: 0,
    taxBps: 0,
    serviceChargeBps: 0,
    currency: checkout.currency ?? 'NGN',
    currencyMinorUnit: 2,
    priceDisplayIncludesTax: false,
    childrenAllowed: true,
    maxGuestsPerRoomDefault: 2,
    extraBedAllowed: false,
    idRequiredAtCheckIn: rules.idRequiredAtCheckin ?? true,
    idRequirementText: room.idPolicy ?? null,
    houseRules: [
      rules.checkInTime && `Check-in: ${rules.checkInTime}`,
      rules.checkOutTime && `Check-out: ${rules.checkOutTime}`,
      rules.quietHours && `Quiet hours: ${rules.quietHours}`,
      rules.visitorsNote,
      rules.damagesNote,
    ].filter(Boolean) as string[],
    petsAllowed: rules.petsAllowed ?? false,
    petsPolicyText: rules.petsNote ?? null,
    smokingPolicy: rules.smokingPolicy ?? 'non_smoking',
    minLeadTimeHours: 2,
    maxAdvanceBookingDays: room.bookingWindowDays ?? 365,
    minNights: room.minNights ?? 1,
    maxNights: room.maxNights ?? 30,
    sameDayCutoff: room.sameDayCutoff ?? '18:00',
    siteConfig: site,
    manageSettings: { ...(f.manage ?? {}), paymentMode: 'pay_at_hotel' },
    policySettings: policy,
    holdMinutes: Math.round((checkout.holdSeconds ?? 900) / 60),
    autoExpireHolds: true,
    confirmationModeDefault: 'manual_approval',
    allowGuestCancellation: true,
    guestCancelCutoffHours: room.freeCancellationHours ?? 48,
    refundBpsAfterWindow: Math.round(
      (cancellation.refundPercentAfterWindow ?? 0) * 100,
    ),
    requireTransferProof: true,
    allowOnlinePayment: false,
    allowPayAtHotel: true,
    allowBankTransfer: true,
    guestSelfServiceChangeDates: true,
    guestSelfServiceCancel: true,
    guestSelfServiceAddExtras: false,
    enquiryResponseHoursDisplay: content.enquiryResponseHours ?? 24,
    heroCtaText: 'Book direct',
    maintenanceMode: false,
    analytics: content.analytics ?? null,
    consent: f.consent ?? null,
    social: site.social ?? null,
    updatedAt: now,
  };
}

function legalPage(slug: string, now: Date): NewSitePage | null {
  const page = (f.policies as AnyRecord[]).find((p) => p.slug === slug);
  if (!page) return null;
  return {
    slug,
    title: page.title,
    intro: page.summary ?? null,
    template: 'policy',
    status: 'draft',
    heroImageUrl: null,
    heroImageAlt: null,
    content: {
      page,
      body: page.body ?? [
        {
          type: 'p',
          text: '[PLACEHOLDER — legal text required before publishing]',
        },
      ],
    },
    metaTitle: page.metaTitle ?? null,
    metaDescription: page.metaDescription ?? null,
    ogImageUrl: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function contentPage(slug: string, now: Date): NewSitePage {
  if (LEGAL_SLUGS.has(slug)) {
    const page = legalPage(slug, now);
    if (page) return page;
  }

  const site = f.site as AnyRecord;
  const fixturePage = (f.sitePages as AnyRecord)[slug] as AnyRecord | undefined;

  if (slug === 'home') {
    return {
      slug,
      title: site.name,
      intro: site.description ?? null,
      template: 'default',
      status: 'draft',
      heroImageUrl: site.hero?.image?.src ?? null,
      heroImageAlt: site.hero?.image?.alt ?? null,
      content: {
        page: {
          title: site.name,
          intro: site.description,
          body: [
            {
              type: 'p',
              text: '[PLACEHOLDER — add the home page introduction before publishing]',
            },
          ],
        },
        body: [],
      },
      metaTitle: site.name,
      metaDescription: site.description ?? null,
      ogImageUrl: null,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  const page = fixturePage ?? {};
  return {
    slug,
    title: page.title ?? slug,
    intro: page.intro ?? null,
    template: 'default',
    status: 'draft',
    heroImageUrl: page.heroImage?.src ?? null,
    heroImageAlt: page.heroImage?.alt ?? null,
    content: {
      page: { ...page, body: page.body ?? [] },
      body: page.body ?? [],
    },
    metaTitle: page.metaTitle ?? null,
    metaDescription: page.metaDescription ?? null,
    ogImageUrl: page.ogImage?.src ?? null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function seedNotificationRecipients(
  executor: SeedExecutor,
): Promise<void> {
  const email = requiredEnv('NOTIFICATION_RECIPIENT_EMAIL').toLowerCase();
  for (const template of DEFAULT_NOTIFICATION_TEMPLATES) {
    const [existing] = await executor
      .select({ id: notificationRecipients.id })
      .from(notificationRecipients)
      .where(
        and(
          eq(notificationRecipients.templateKey, template.key),
          eq(notificationRecipients.recipientType, 'email'),
          eq(notificationRecipients.email, email),
        ),
      )
      .limit(1);
    if (existing) continue;
    await executor.insert(notificationRecipients).values({
      templateKey: template.key,
      recipientType: 'email',
      email,
      isActive: true,
    });
  }
}

export interface BootstrapOptions {
  executor?: SeedExecutor;
  now?: Date;
  skipOwner?: boolean;
}

export interface BootstrapResult {
  settingsCreated: boolean;
  ownerCreated: boolean;
}

export async function runBootstrap(
  options: BootstrapOptions = {},
): Promise<BootstrapResult> {
  const executor = options.executor ?? db;
  const now = options.now ?? new Date();

  const [insertedSettings] = await executor
    .insert(hotelSettings)
    .values(settingsValues(now))
    .onConflictDoNothing({ target: hotelSettings.id })
    .returning({ id: hotelSettings.id });

  for (const [index, amenity] of (f.amenities as AnyRecord[]).entries()) {
    await executor
      .insert(amenities)
      .values({
        key: amenity.key,
        label: amenity.label,
        description: amenity.description ?? null,
        sortOrder: index + 1,
        isActive: true,
      })
      .onConflictDoNothing({ target: amenities.key });
  }

  for (const template of DEFAULT_NOTIFICATION_TEMPLATES) {
    await executor
      .insert(notificationTemplates)
      .values(template)
      .onConflictDoNothing({ target: notificationTemplates.key });
  }

  await seedNotificationRecipients(executor);

  for (const slug of PAGE_SLUGS) {
    await executor
      .insert(sitePages)
      .values(contentPage(slug, now))
      .onConflictDoNothing({ target: sitePages.slug });
  }

  let ownerCreated = false;
  if (!options.skipOwner) {
    const owner = await runOwnerSeed(executor);
    ownerCreated = owner.created;
  }

  return {
    settingsCreated: Boolean(insertedSettings),
    ownerCreated,
  };
}
