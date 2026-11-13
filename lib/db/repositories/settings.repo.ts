/**
 * Data access for hotel settings, bank accounts, and social links. Settings
 * live in a singleton row (id 1); bank account and social link reads can
 * include inactive rows.
 */

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { bankAccounts, hotelSettings, socialLinks } from '@/db/schema';
import type {
  BankAccount,
  HotelSettings,
  NewBankAccount,
  NewHotelSettings,
  NewSocialLink,
  SocialLink,
} from '@/db/types';

/** Returns the singleton hotel settings row, or null if not yet created. */
export async function getHotelSettings(): Promise<HotelSettings | null> {
  const [row] = await db
    .select()
    .from(hotelSettings)
    .where(eq(hotelSettings.id, 1))
    .limit(1);
  return row ?? null;
}

/**
 * Creates or updates the singleton hotel settings row (id 1), always
 * refreshing `updatedAt`.
 */
export async function upsertHotelSettings(
  data: Partial<NewHotelSettings>,
): Promise<HotelSettings> {
  const [row] = await db
    .insert(hotelSettings)
    .values({ id: 1, ...data } as NewHotelSettings)
    .onConflictDoUpdate({
      target: hotelSettings.id,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  return row;
}

/** Lists bank accounts, active-only by default. */
export async function listBankAccounts(
  activeOnly = true,
): Promise<BankAccount[]> {
  if (activeOnly) {
    const { eq } = await import('drizzle-orm');
    return db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.isActive, true));
  }
  return db.select().from(bankAccounts);
}

/** Loads a bank account by id, including inactive rows. */
export async function getBankAccountById(
  id: string,
): Promise<BankAccount | null> {
  const [row] = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.id, id))
    .limit(1);
  return row ?? null;
}

/** Creates a bank account and returns the inserted row. */
export async function createBankAccount(
  data: NewBankAccount,
): Promise<BankAccount> {
  const [row] = await db.insert(bankAccounts).values(data).returning();
  return row;
}

/** Updates a bank account, refreshing `updatedAt`; null when it is missing. */
export async function updateBankAccount(
  id: string,
  data: Partial<NewBankAccount>,
): Promise<BankAccount | null> {
  const [row] = await db
    .update(bankAccounts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(bankAccounts.id, id))
    .returning();
  return row ?? null;
}

/** Deletes a bank account and returns the removed row, or null. */
export async function deleteBankAccount(
  id: string,
): Promise<BankAccount | null> {
  const [row] = await db
    .delete(bankAccounts)
    .where(eq(bankAccounts.id, id))
    .returning();
  return row ?? null;
}

/** Lists social links, active-only by default. */
export async function listSocialLinks(
  activeOnly = true,
): Promise<SocialLink[]> {
  if (activeOnly) {
    return db.select().from(socialLinks).where(eq(socialLinks.isActive, true));
  }
  return db.select().from(socialLinks);
}

/** Loads a social link by id, including inactive rows. */
export async function getSocialLinkById(
  id: string,
): Promise<SocialLink | null> {
  const [row] = await db
    .select()
    .from(socialLinks)
    .where(eq(socialLinks.id, id))
    .limit(1);
  return row ?? null;
}

/** Creates a social link and returns the inserted row. */
export async function createSocialLink(
  data: NewSocialLink,
): Promise<SocialLink> {
  const [row] = await db.insert(socialLinks).values(data).returning();
  return row;
}

/** Updates a social link, refreshing `updatedAt`; null when it is missing. */
export async function updateSocialLink(
  id: string,
  data: Partial<NewSocialLink>,
): Promise<SocialLink | null> {
  const [row] = await db
    .update(socialLinks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(socialLinks.id, id))
    .returning();
  return row ?? null;
}

/** Deletes a social link and returns the removed row, or null. */
export async function deleteSocialLink(id: string): Promise<SocialLink | null> {
  const [row] = await db
    .delete(socialLinks)
    .where(eq(socialLinks.id, id))
    .returning();
  return row ?? null;
}
