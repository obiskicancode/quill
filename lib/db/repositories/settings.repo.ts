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

export async function getHotelSettings(): Promise<HotelSettings | null> {
  const [row] = await db
    .select()
    .from(hotelSettings)
    .where(eq(hotelSettings.id, 1))
    .limit(1);
  return row ?? null;
}

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

export async function createBankAccount(
  data: NewBankAccount,
): Promise<BankAccount> {
  const [row] = await db.insert(bankAccounts).values(data).returning();
  return row;
}

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

export async function deleteBankAccount(
  id: string,
): Promise<BankAccount | null> {
  const [row] = await db
    .delete(bankAccounts)
    .where(eq(bankAccounts.id, id))
    .returning();
  return row ?? null;
}

export async function listSocialLinks(
  activeOnly = true,
): Promise<SocialLink[]> {
  if (activeOnly) {
    return db.select().from(socialLinks).where(eq(socialLinks.isActive, true));
  }
  return db.select().from(socialLinks);
}

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

export async function createSocialLink(
  data: NewSocialLink,
): Promise<SocialLink> {
  const [row] = await db.insert(socialLinks).values(data).returning();
  return row;
}

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

export async function deleteSocialLink(id: string): Promise<SocialLink | null> {
  const [row] = await db
    .delete(socialLinks)
    .where(eq(socialLinks.id, id))
    .returning();
  return row ?? null;
}
