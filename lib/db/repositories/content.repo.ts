import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import {
  facilities,
  faqs,
  galleryImages,
  nearbyAttractions,
  sitePageRevisions,
  sitePages,
  teamMembers,
  testimonials,
} from '@/db/schema';
import type {
  Facility,
  Faq,
  GalleryImage,
  NearbyAttraction,
  NewFacility,
  NewFaq,
  NewGalleryImage,
  NewNearbyAttraction,
  NewSitePage,
  NewSitePageRevision,
  NewTeamMember,
  NewTestimonial,
  SitePage,
  SitePageRevision,
  TeamMember,
  Testimonial,
} from '@/db/types';

export async function listSitePages(): Promise<SitePage[]> {
  return db.select().from(sitePages).orderBy(desc(sitePages.createdAt));
}

export async function getSitePageBySlug(
  slug: string,
): Promise<SitePage | null> {
  const [row] = await db
    .select()
    .from(sitePages)
    .where(eq(sitePages.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getSitePageById(id: string): Promise<SitePage | null> {
  const [row] = await db
    .select()
    .from(sitePages)
    .where(eq(sitePages.id, id))
    .limit(1);
  return row ?? null;
}

export async function createSitePage(data: NewSitePage): Promise<SitePage> {
  const [row] = await db.insert(sitePages).values(data).returning();
  return row;
}

export async function updateSitePage(
  id: string,
  data: Partial<NewSitePage>,
): Promise<SitePage | null> {
  const [row] = await db
    .update(sitePages)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(sitePages.id, id))
    .returning();
  return row ?? null;
}

export async function listSitePageRevisions(
  pageId: string,
): Promise<SitePageRevision[]> {
  return db
    .select()
    .from(sitePageRevisions)
    .where(eq(sitePageRevisions.pageId, pageId))
    .orderBy(desc(sitePageRevisions.createdAt));
}

export async function addSitePageRevision(
  data: NewSitePageRevision,
): Promise<SitePageRevision> {
  const [row] = await db.insert(sitePageRevisions).values(data).returning();
  return row;
}

export async function listFacilities(activeOnly = true): Promise<Facility[]> {
  if (activeOnly) {
    return db.select().from(facilities).where(eq(facilities.isActive, true));
  }
  return db.select().from(facilities);
}

export async function createFacility(data: NewFacility): Promise<Facility> {
  const [row] = await db.insert(facilities).values(data).returning();
  return row;
}

export async function updateFacility(
  id: string,
  data: Partial<NewFacility>,
): Promise<Facility | null> {
  const [row] = await db
    .update(facilities)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(facilities.id, id))
    .returning();
  return row ?? null;
}

export async function listGalleryImages(
  activeOnly = true,
): Promise<GalleryImage[]> {
  if (activeOnly) {
    return db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.isActive, true));
  }
  return db.select().from(galleryImages);
}

export async function createGalleryImage(
  data: NewGalleryImage,
): Promise<GalleryImage> {
  const [row] = await db.insert(galleryImages).values(data).returning();
  return row;
}

export async function updateGalleryImage(
  id: string,
  data: Partial<NewGalleryImage>,
): Promise<GalleryImage | null> {
  const [row] = await db
    .update(galleryImages)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(galleryImages.id, id))
    .returning();
  return row ?? null;
}

export async function listTestimonials(
  activeOnly = true,
): Promise<Testimonial[]> {
  if (activeOnly) {
    return db
      .select()
      .from(testimonials)
      .where(eq(testimonials.isActive, true));
  }
  return db.select().from(testimonials);
}

export async function createTestimonial(
  data: NewTestimonial,
): Promise<Testimonial> {
  const [row] = await db.insert(testimonials).values(data).returning();
  return row;
}

export async function updateTestimonial(
  id: string,
  data: Partial<NewTestimonial>,
): Promise<Testimonial | null> {
  const [row] = await db
    .update(testimonials)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(testimonials.id, id))
    .returning();
  return row ?? null;
}

export async function listFaqs(activeOnly = true): Promise<Faq[]> {
  if (activeOnly) {
    return db.select().from(faqs).where(eq(faqs.isActive, true));
  }
  return db.select().from(faqs);
}

export async function createFaq(data: NewFaq): Promise<Faq> {
  const [row] = await db.insert(faqs).values(data).returning();
  return row;
}

export async function updateFaq(
  id: string,
  data: Partial<NewFaq>,
): Promise<Faq | null> {
  const [row] = await db
    .update(faqs)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(faqs.id, id))
    .returning();
  return row ?? null;
}

export async function listTeamMembers(
  activeOnly = true,
): Promise<TeamMember[]> {
  if (activeOnly) {
    return db.select().from(teamMembers).where(eq(teamMembers.isActive, true));
  }
  return db.select().from(teamMembers);
}

export async function createTeamMember(
  data: NewTeamMember,
): Promise<TeamMember> {
  const [row] = await db.insert(teamMembers).values(data).returning();
  return row;
}

export async function updateTeamMember(
  id: string,
  data: Partial<NewTeamMember>,
): Promise<TeamMember | null> {
  const [row] = await db
    .update(teamMembers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(teamMembers.id, id))
    .returning();
  return row ?? null;
}

export async function listNearbyAttractions(
  activeOnly = true,
): Promise<NearbyAttraction[]> {
  if (activeOnly) {
    return db
      .select()
      .from(nearbyAttractions)
      .where(eq(nearbyAttractions.isActive, true));
  }
  return db.select().from(nearbyAttractions);
}

export async function createNearbyAttraction(
  data: NewNearbyAttraction,
): Promise<NearbyAttraction> {
  const [row] = await db.insert(nearbyAttractions).values(data).returning();
  return row;
}

export async function updateNearbyAttraction(
  id: string,
  data: Partial<NewNearbyAttraction>,
): Promise<NearbyAttraction | null> {
  const [row] = await db
    .update(nearbyAttractions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(nearbyAttractions.id, id))
    .returning();
  return row ?? null;
}
