import { eq } from 'drizzle-orm';

import { db } from '@/db';
import {
  amenities,
  bankAccounts,
  extras,
  facilities,
  faqs,
  galleryImages,
  hotelSettings,
  nearbyAttractions,
  rateRules,
  rooms,
  roomTypeAmenities,
  roomTypes,
  seedRecords,
  sitePages,
  socialLinks,
  teamMembers,
  testimonials,
} from '@/db/schema';
import type { NewSitePage } from '@/db/types';

import fixtures from './fixtures.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;
const f = fixtures as AnyRecord;
const now = new Date();

async function alreadySeeded(rowId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: seedRecords.id })
    .from(seedRecords)
    .where(eq(seedRecords.rowId, rowId))
    .limit(1);
  return Boolean(row);
}

async function markSeeded(
  tableName: string,
  rowId: string,
  seedName = 'initial',
): Promise<void> {
  await db.insert(seedRecords).values({ tableName, rowId, seedName });
}

const amenityLabels: Record<string, string> = {
  ac: 'Air conditioning',
  tv: 'TV',
  kitchen: 'Kitchen',
  breakfast: 'Breakfast',
  laundry: 'Laundry',
  workdesk: 'Work desk',
};

function minor(ngn: number | null | undefined): number {
  return Math.round((ngn ?? 0) * 100);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seedSettings(): Promise<void> {
  const site = f.site as AnyRecord;
  const content = f.contentSettings as AnyRecord;
  const room = f.roomSettings as AnyRecord;
  const checkout = f.checkout as AnyRecord;
  const policy = f.policySettings as AnyRecord;
  const rules = policy.houseRules as AnyRecord;
  const cancellation = policy.cancellation as AnyRecord;
  const address = content.address as AnyRecord;

  const houseRules = [
    rules.checkInTime && `Check-in: ${rules.checkInTime}`,
    rules.checkOutTime && `Check-out: ${rules.checkOutTime}`,
    rules.quietHours && `Quiet hours: ${rules.quietHours}`,
    rules.visitorsNote,
    rules.damagesNote,
  ].filter(Boolean) as string[];

  await db
    .insert(hotelSettings)
    .values({
      id: 1,
      displayName: site.name,
      legalName: content.legalName ?? site.name,
      tagline: content.tagline ?? site.description,
      propertyType: 'hotel',
      yearEstablished: content.yearEstablished ?? null,
      description: site.description,
      heroTitle: site.hero.headline,
      heroSubtitle: site.hero.subheadline,
      heroImageUrl: site.hero.image?.src,
      heroImageAlt: site.hero.image?.alt,
      address: [address.line1, address.area, address.city, address.state]
        .filter(Boolean)
        .join(', '),
      city: address.city ?? 'Lagos',
      state: address.state ?? null,
      country: 'NG',
      latitude: content.latitude ?? null,
      longitude: content.longitude ?? null,
      googleMapsUrl: content.googleMapsUrl ?? null,
      googleMapsEmbedUrl: content.googleMapsEmbedUrl ?? null,
      directionsText: content.directionsText ?? null,
      nearestAirportNote: content.nearestAirportNote ?? null,
      publicPhones: (content.publicPhones ?? []).map(
        (p: AnyRecord) => p.display ?? p.tel,
      ),
      whatsappNumber: site.contact.whatsappNumber,
      whatsappPrefillMessage: site.contact.whatsappMessage,
      publicEmail: site.contact.email,
      contactFormRecipient: content.contactFormRecipient ?? site.contact.email,
      receptionHours: site.reception,
      googleReviewsUrl: site.googleReviewsUrl ?? null,
      enquiryResponseHours: content.enquiryResponseHours ?? 24,
      timezone: room.timeZone ?? 'Africa/Lagos',
      checkInTime: checkout.checkInTime24 ?? '14:00',
      checkOutTime: '12:00',
      earlyCheckinPolicy: null,
      lateCheckoutPolicy: null,
      cancellationPolicyType: cancellation.policyType ?? 'moderate',
      freeCancellationHours: room.freeCancellationHours ?? 48,
      afterDeadlineRule: {
        kind: 'percent',
        value: cancellation.refundPercentAfterWindow ?? 0,
      },
      depositBps: Math.round((checkout.depositPercent ?? 0) * 100),
      taxBps: Math.round((room.taxPercent ?? 0) * 100),
      serviceChargeBps: Math.round((room.serviceChargePercent ?? 0) * 100),
      currency: 'NGN',
      currencyMinorUnit: 2,
      priceDisplayIncludesTax: false,
      childrenAllowed: true,
      maxGuestsPerRoomDefault: 2,
      extraBedAllowed: true,
      extraBedPriceMinor: minor(10000),
      idRequiredAtCheckIn: rules.idRequiredAtCheckin ?? true,
      idRequirementText: room.idPolicy ?? null,
      houseRules,
      petsAllowed: rules.petsAllowed ?? false,
      petsPolicyText: rules.petsNote ?? null,
      smokingPolicy: rules.smokingPolicy ?? 'non_smoking',
      minLeadTimeHours: 2,
      maxAdvanceBookingDays: room.bookingWindowDays ?? 365,
      minNights: room.minNights ?? 1,
      maxNights: room.maxNights ?? 30,
      sameDayCutoff: room.sameDayCutoff ?? '18:00',
      siteConfig: site,
      manageSettings: f.manage,
      policySettings: policy,
      holdMinutes: Math.round((checkout.holdSeconds ?? 900) / 60),
      autoExpireHolds: true,
      confirmationModeDefault: checkout.confirmationMode ?? 'instant',
      allowGuestCancellation: true,
      guestCancelCutoffHours: room.freeCancellationHours ?? 48,
      refundBpsAfterWindow: Math.round(
        (cancellation.refundPercentAfterWindow ?? 0) * 100,
      ),
      requireTransferProof: true,
      allowOnlinePayment: true,
      allowPayAtHotel: true,
      allowBankTransfer: true,
      guestSelfServiceChangeDates: true,
      guestSelfServiceCancel: true,
      guestSelfServiceAddExtras: false,
      enquiryResponseHoursDisplay: content.enquiryResponseHours ?? 24,
      heroCtaText: 'Book direct',
      maintenanceMode: false,
      analytics: null,
      consent: f.consent,
      social: site.social,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: hotelSettings.id,
      set: { updatedAt: now },
    });

  await db
    .insert(bankAccounts)
    .values({
      id: 'bank-1',
      bankName: checkout.bank.bankName,
      accountName: checkout.bank.accountName,
      accountNumber: checkout.bank.accountNumber,
      currency: 'NGN',
      instructions: 'Use your booking reference as the transfer description.',
      isActive: true,
      sortOrder: 1,
    })
    .onConflictDoUpdate({
      target: bankAccounts.id,
      set: {
        bankName: checkout.bank.bankName,
        accountName: checkout.bank.accountName,
        accountNumber: checkout.bank.accountNumber,
        updatedAt: now,
      },
    });

  for (const [index, link] of (site.social as AnyRecord[]).entries()) {
    await db
      .insert(socialLinks)
      .values({
        id: link.platform ?? `social-${index + 1}`,
        platform: link.platform,
        url: link.href ?? link.url,
        label: link.label,
        isActive: true,
        sortOrder: index + 1,
      })
      .onConflictDoUpdate({
        target: socialLinks.id,
        set: { url: link.href ?? link.url, label: link.label, updatedAt: now },
      });
  }
}

async function seedRooms(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const roomFixtures = f.roomTypes as AnyRecord[];

  for (const [index, entry] of roomFixtures.entries()) {
    const r = entry.room as AnyRecord;
    const detail = entry.detail as AnyRecord;
    const [row] = await db
      .insert(roomTypes)
      .values({
        name: r.name,
        slug: r.slug,
        shortDescription: detail.description ?? r.description,
        description: detail.description ?? r.description,
        bedConfig: r.bedConfig,
        maxAdults: r.maxAdults ?? 2,
        maxChildren: r.maxChildren ?? 0,
        maxOccupancy: (r.maxAdults ?? 2) + (r.maxChildren ?? 0),
        minStayNights: r.minStayNights ?? 1,
        basePriceMinor: detail.basePriceMinor ?? minor(r.basePriceNgn),
        weekendPriceMinor: detail.weekendPriceMinor ?? minor(r.weekendPriceNgn),
        extraAdultPriceMinor: 0,
        extraChildPriceMinor: 0,
        extraBedAvailable: r.extraBed?.available ?? false,
        showPrice: r.showPrice ?? true,
        breakfastIncluded: r.breakfastIncluded ?? false,
        taxesIncluded: r.taxesIncluded ?? false,
        viewNotes: detail.viewNotes ?? null,
        sizeSqm: r.sizeSqm ? String(r.sizeSqm) : null,
        isActive: detail.active ?? true,
        isFeatured: r.popular ?? false,
        sortOrder: index + 1,
        metaTitle: detail.metaTitle ?? null,
        metaDescription: detail.metaDescription ?? null,
        coverImageUrl: r.images?.[0]?.src ?? null,
        coverImageAlt: r.images?.[0]?.alt ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: roomTypes.slug,
        set: {
          name: r.name,
          basePriceMinor: detail.basePriceMinor ?? minor(r.basePriceNgn),
          weekendPriceMinor:
            detail.weekendPriceMinor ?? minor(r.weekendPriceNgn),
          isActive: detail.active ?? true,
          isFeatured: r.popular ?? false,
          updatedAt: now,
        },
      })
      .returning({ id: roomTypes.id });

    map.set(r.id, row.id);

    await db
      .insert(rooms)
      .values({
        roomTypeId: row.id,
        roomNumber: `10${index + 1}`,
        floor: '1',
        status: 'active',
        isActive: true,
        updatedAt: now,
      })
      .onConflictDoNothing();

    for (const [imageIndex, image] of (r.images ?? []).entries()) {
      const rowId = `room-image-${r.slug}-${imageIndex + 1}`;
      if (await alreadySeeded(rowId)) continue;
      await db.insert(galleryImages).values({
        category: 'rooms',
        title: r.name,
        altText: image.alt ?? r.name,
        imageUrl: image.src,
        roomTypeId: row.id,
        caption: detail.gallery?.[imageIndex]?.caption ?? null,
        isActive: true,
        sortOrder: imageIndex + 1,
      });
      await markSeeded('gallery_images', rowId);
    }

    for (const [testimonialIndex, testimonial] of (
      detail.testimonials ?? []
    ).entries()) {
      const rowId = `room-testimonial-${r.slug}-${testimonialIndex + 1}`;
      if (await alreadySeeded(rowId)) continue;
      await db.insert(testimonials).values({
        guestName: testimonial.guestName,
        roomTypeId: row.id,
        quote: testimonial.quote,
        rating: testimonial.rating ?? null,
        stayType: testimonial.stayType ?? null,
        isFeatured: false,
        isActive: true,
        sortOrder: testimonialIndex + 1,
      });
      await markSeeded('testimonials', rowId);
    }
  }

  return map;
}

async function seedCatalog(roomMap: Map<string, string>): Promise<void> {
  const seen = new Set<string>();
  for (const amenity of f.amenities as AnyRecord[]) {
    seen.add(amenity.key);
    await db
      .insert(amenities)
      .values({
        key: amenity.key,
        label: amenity.label,
        description: amenity.description,
        sortOrder: (f.amenities as AnyRecord[]).indexOf(amenity) + 1,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: amenities.key,
        set: { label: amenity.label, description: amenity.description },
      });
  }
  for (const entry of f.roomTypes as AnyRecord[]) {
    for (const key of entry.room.amenities ?? []) seen.add(key);
  }
  for (const key of seen) {
    if ((f.amenities as AnyRecord[]).some((a) => a.key === key)) continue;
    await db
      .insert(amenities)
      .values({
        key,
        label: amenityLabels[key] ?? key.replace(/(^|_)(\w)/g, ' $2').trim(),
        isActive: true,
      })
      .onConflictDoUpdate({
        target: amenities.key,
        set: { key },
      });
  }

  const amenityRows = await db.select().from(amenities);
  const amenityByKey = new Map(amenityRows.map((row) => [row.key, row.id]));
  for (const entry of f.roomTypes as AnyRecord[]) {
    const roomTypeId = roomMap.get(entry.room.id);
    if (!roomTypeId) continue;
    for (const key of entry.room.amenities ?? []) {
      const amenityId = amenityByKey.get(key);
      if (!amenityId) continue;
      const existing = await db
        .select({ roomTypeId: roomTypeAmenities.roomTypeId })
        .from(roomTypeAmenities)
        .where(eq(roomTypeAmenities.roomTypeId, roomTypeId));
      if (existing.some((r) => r.roomTypeId)) {
        const already = await db
          .select({ roomTypeId: roomTypeAmenities.roomTypeId })
          .from(roomTypeAmenities)
          .where(eq(roomTypeAmenities.amenityId, amenityId));
        if (already.some((r) => r.roomTypeId === roomTypeId)) continue;
      }
      await db.insert(roomTypeAmenities).values({ roomTypeId, amenityId });
    }
  }

  for (const [index, extra] of (f.extras as AnyRecord[]).entries()) {
    await db
      .insert(extras)
      .values({
        name: extra.name,
        slug: extra.id,
        description: extra.description,
        priceMinor: extra.priceMinor,
        maxQuantity: extra.maxQuantity ?? 10,
        pricingUnit: extra.unit,
        isActive: true,
        sortOrder: index + 1,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: extras.slug,
        set: {
          name: extra.name,
          description: extra.description,
          priceMinor: extra.priceMinor,
          maxQuantity: extra.maxQuantity ?? 10,
          pricingUnit: extra.unit,
          updatedAt: now,
        },
      });
  }
}

async function seedContent(roomMap: Map<string, string>): Promise<void> {
  const pages = { ...(f.sitePages as AnyRecord) } as AnyRecord;
  for (const policy of f.policies as AnyRecord[]) {
    pages[policy.slug] = {
      ...policy,
      heroImage: null,
      content: { body: policy.body ?? [] },
    };
  }

  for (const page of Object.values(pages) as AnyRecord[]) {
    const appNotice = {
      ...page,
      content: page.content ?? {},
    };
    await db
      .insert(sitePages)
      .values({
        slug: page.slug,
        title: page.title,
        intro: page.summary ?? page.intro ?? null,
        template: page.summary ? 'policy' : 'default',
        status: page.isPublished === false ? 'draft' : 'published',
        heroImageUrl: page.heroImage?.src ?? null,
        heroImageAlt: page.heroImage?.alt ?? null,
        content: { page: appNotice, body: page.body ?? [] },
        metaTitle: page.metaTitle ?? null,
        metaDescription: page.metaDescription ?? null,
        ogImageUrl: page.ogImage?.src ?? null,
        publishedAt: now,
        updatedAt: now,
      } satisfies NewSitePage)
      .onConflictDoUpdate({
        target: sitePages.slug,
        set: {
          title: page.title,
          intro: page.summary ?? page.intro ?? null,
          status: page.isPublished === false ? 'draft' : 'published',
          heroImageUrl: page.heroImage?.src ?? null,
          heroImageAlt: page.heroImage?.alt ?? null,
          content: { page: appNotice, body: page.body ?? [] },
          metaTitle: page.metaTitle ?? null,
          metaDescription: page.metaDescription ?? null,
          updatedAt: now,
        },
      });
  }

  for (const [index, facility] of (f.facilities as AnyRecord[]).entries()) {
    await db
      .insert(facilities)
      .values({
        name: facility.name,
        slug: facility.slug,
        description: facility.description,
        icon: facility.icon ?? null,
        kind: facility.kind ?? 'other',
        openingHours: facility.openingHours ?? null,
        pricing: facility.pricing ?? null,
        priceNote: facility.priceNote ?? null,
        capacity: facility.capacity ?? null,
        layouts: facility.layouts ?? [],
        ctaLabel: facility.ctaLabel ?? null,
        ctaTopic: facility.ctaTopic ?? null,
        imageUrl: facility.image?.src ?? null,
        imageAlt: facility.image?.alt ?? null,
        isActive: true,
        sortOrder: facility.sortOrder ?? index + 1,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: facilities.slug,
        set: {
          name: facility.name,
          description: facility.description,
          openingHours: facility.openingHours ?? null,
          pricing: facility.pricing ?? null,
          priceNote: facility.priceNote ?? null,
          capacity: facility.capacity ?? null,
          layouts: facility.layouts ?? [],
          ctaLabel: facility.ctaLabel ?? null,
          ctaTopic: facility.ctaTopic ?? null,
          imageUrl: facility.image?.src ?? null,
          imageAlt: facility.image?.alt ?? null,
          updatedAt: now,
        },
      });
  }

  for (const image of f.gallery as AnyRecord[]) {
    const rowId = `gallery-${image.id}`;
    if (await alreadySeeded(rowId)) continue;
    await db.insert(galleryImages).values({
      category: image.category,
      title: image.caption ?? null,
      altText: image.altText,
      imageUrl: image.url,
      thumbnailUrl: image.thumbnailUrl ?? null,
      caption: image.caption ?? null,
      roomTypeId: roomMap.get(image.roomTypeId) ?? null,
      width: image.width ?? null,
      height: image.height ?? null,
      color: image.color ?? null,
      blurDataUrl: image.blurDataURL ?? null,
      isActive: image.isPublished !== false,
      sortOrder: image.sortOrder ?? 0,
      updatedAt: now,
    });
    await markSeeded('gallery_images', rowId);
  }

  for (const [index, testimonial] of (
    f.testimonials as AnyRecord[]
  ).entries()) {
    const rowId = `testimonial-${testimonial.id}`;
    if (await alreadySeeded(rowId)) continue;
    await db.insert(testimonials).values({
      guestName: testimonial.guestName,
      quote: testimonial.quote,
      rating: testimonial.rating ?? null,
      stayType: testimonial.stayType ?? null,
      isFeatured: true,
      isActive: true,
      sortOrder: index + 1,
    });
    await markSeeded('testimonials', rowId);
  }

  for (const [index, faq] of (f.faqs as AnyRecord[]).entries()) {
    const rowId = `faq-${faq.id}`;
    if (await alreadySeeded(rowId)) continue;
    await db.insert(faqs).values({
      question: faq.question,
      answer: faq.answer,
      category: faq.category ?? null,
      isActive: true,
      sortOrder: faq.sortOrder ?? index + 1,
    });
    await markSeeded('faqs', rowId);
  }

  for (const [index, member] of (f.team as AnyRecord[]).entries()) {
    const rowId = `team-${member.id}`;
    if (await alreadySeeded(rowId)) continue;
    await db.insert(teamMembers).values({
      name: member.name,
      role: member.role,
      bio: member.bio,
      imageUrl: member.photo?.src ?? null,
      imageAlt: member.photo?.alt ?? null,
      isActive: member.isPublished !== false,
      sortOrder: member.sortOrder ?? index + 1,
    });
    await markSeeded('team_members', rowId);
  }

  for (const [index, attraction] of (f.attractions as AnyRecord[]).entries()) {
    const rowId = `attraction-${attraction.id}`;
    if (await alreadySeeded(rowId)) continue;
    await db.insert(nearbyAttractions).values({
      name: attraction.name,
      distance: attraction.distanceNote ?? null,
      description: attraction.description,
      sortOrder: attraction.sortOrder ?? index + 1,
      isActive: true,
    });
    await markSeeded('nearby_attractions', rowId);
  }

  const year = now.getFullYear();
  for (const rule of f.rateRules as AnyRecord[]) {
    for (const seasonYear of [year, year + 1]) {
      const [startMonth, startDay] = String(rule.start).split('-');
      const [endMonth, endDay] = String(rule.end).split('-');
      const startDate = `${seasonYear}-${startMonth}-${startDay}`;
      const endDate =
        endMonth < startMonth
          ? `${seasonYear + 1}-${endMonth}-${endDay}`
          : `${seasonYear}-${endMonth}-${endDay}`;
      const rowId = `rate-${slugify(rule.label)}-${seasonYear}`;
      if (await alreadySeeded(rowId)) continue;
      await db.insert(rateRules).values({
        name: rule.label,
        startDate,
        endDate,
        adjustmentType: 'percent_markup',
        adjustmentValue: rule.upliftPercent ?? 0,
        priority: 10,
        isActive: true,
        updatedAt: now,
      });
      await markSeeded('rate_rules', rowId);
    }
  }
}

async function main(): Promise<void> {
  await seedSettings();
  const roomMap = await seedRooms();
  await seedCatalog(roomMap);
  await seedContent(roomMap);
  console.log('Seed complete.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
