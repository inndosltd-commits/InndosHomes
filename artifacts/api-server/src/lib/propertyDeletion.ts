import { db } from "@workspace/db";
import {
  bookings,
  favorites,
  featuredListingUses,
  notifications,
  properties,
  propertyBlocks,
  propertyManagementCalendarEntries,
  propertyTransactions,
  reviews,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

/** Delete every dependent property record before the listing, atomically. */
export async function deletePropertyTransactionally(propertyId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [property] = await tx
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .for("update");
    if (!property) return false;

    // Notifications reference bookings, so they must be removed before either
    // transaction confirmations or bookings.
    await tx.delete(notifications).where(
      sql`${notifications.bookingId} IN (
        SELECT ${bookings.id} FROM ${bookings}
        WHERE ${bookings.propertyId} = ${propertyId}
      )`,
    );
    await tx.delete(propertyManagementCalendarEntries).where(eq(propertyManagementCalendarEntries.propertyId, propertyId));
    await tx.delete(featuredListingUses).where(eq(featuredListingUses.propertyId, propertyId));
    await tx.delete(reviews).where(eq(reviews.propertyId, propertyId));
    await tx.delete(propertyTransactions).where(eq(propertyTransactions.propertyId, propertyId));
    await tx.delete(favorites).where(eq(favorites.propertyId, propertyId));
    await tx.delete(propertyBlocks).where(eq(propertyBlocks.propertyId, propertyId));
    await tx.delete(bookings).where(eq(bookings.propertyId, propertyId));
    await tx.delete(properties).where(eq(properties.id, propertyId));
    return true;
  });
}