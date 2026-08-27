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
  users,
  subscriptions,
  payments,
  marketers,
  referrals,
  referralVisits,
  marketingAuditLog,
} from "@workspace/db";
import { eq, inArray, or, sql } from "drizzle-orm";

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

/** Delete a user and every record that references the user or their properties. */
export async function deleteUserTransactionally(userId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!user) return false;

    const ownedProperties = await tx
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.ownerId, userId));
    const propertyIds = ownedProperties.map((property) => property.id);

    const ownedMarketer = await tx
      .select({ id: marketers.id })
      .from(marketers)
      .where(eq(marketers.userId, userId));
    const marketerIds = ownedMarketer.map((marketer) => marketer.id);

    // Remove audit rows before the user or marketer they reference.
    await tx.delete(marketingAuditLog).where(or(
      eq(marketingAuditLog.adminId, userId),
      eq(marketingAuditLog.targetUserId, userId),
      ...(marketerIds.length > 0 ? [inArray(marketingAuditLog.targetMarketerId, marketerIds)] : []),
    ));

    // Notifications and property transactions reference bookings with NO ACTION.
    await tx.delete(notifications).where(sql`
      ${notifications.userId} = ${userId}
      OR ${notifications.bookingId} IN (
        SELECT ${bookings.id}
        FROM ${bookings}
        WHERE ${bookings.userId} = ${userId}
        ${propertyIds.length > 0 ? sql`OR ${bookings.propertyId} IN ${propertyIds}` : sql``}
      )
    `);
    await tx.delete(propertyTransactions).where(or(
      eq(propertyTransactions.ownerId, userId),
      eq(propertyTransactions.tenantId, userId),
      ...(propertyIds.length > 0 ? [inArray(propertyTransactions.propertyId, propertyIds)] : []),
    ));
    await tx.delete(bookings).where(or(
      eq(bookings.userId, userId),
      ...(propertyIds.length > 0 ? [inArray(bookings.propertyId, propertyIds)] : []),
    ));

    // Remove property-owned records explicitly rather than relying on mixed
    // historical FK cascade settings across development and production.
    if (propertyIds.length > 0) {
      await tx.delete(propertyManagementCalendarEntries).where(inArray(propertyManagementCalendarEntries.propertyId, propertyIds));
      await tx.delete(featuredListingUses).where(inArray(featuredListingUses.propertyId, propertyIds));
      await tx.delete(reviews).where(inArray(reviews.propertyId, propertyIds));
      await tx.delete(favorites).where(inArray(favorites.propertyId, propertyIds));
      await tx.delete(propertyBlocks).where(inArray(propertyBlocks.propertyId, propertyIds));
      await tx.delete(properties).where(inArray(properties.id, propertyIds));
    }

    await tx.delete(favorites).where(eq(favorites.userId, userId));
    await tx.delete(referrals).where(eq(referrals.referredUserId, userId));
    if (marketerIds.length > 0) {
      await tx.delete(referrals).where(inArray(referrals.marketerId, marketerIds));
      await tx.delete(referralVisits).where(inArray(referralVisits.marketerId, marketerIds));
      await tx.delete(marketers).where(inArray(marketers.id, marketerIds));
    }

    // Payments must be removed before subscriptions because subscription_id
    // uses NO ACTION, and both rows reference the user.
    await tx.delete(payments).where(eq(payments.userId, userId));
    await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));
    await tx.delete(notifications).where(eq(notifications.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
    return true;
  });
}