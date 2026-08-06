import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  decimal,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role")
    .$type<"owner" | "tenant" | "admin" | "host" | "guest">()
    .notNull()
    .default("tenant"),
  status: text("status")
    .$type<"active" | "pending" | "suspended">()
    .notNull()
    .default("active"),
  joinDate: text("join_date").notNull().default(sql`NOW()::date::text`),
  avatar: text("avatar"),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  idDocument: text("id_document"),
  idFront: text("id_front"),
  idBack: text("id_back"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  isRegisteredFirm: boolean("is_registered_firm").notNull().default(false),
  firmType: text("firm_type").$type<"business_name" | "registered_company">(),
  firmCertRegistration: text("firm_cert_registration"),
  firmCertIncorporation: text("firm_cert_incorporation"),
  firmCr12: text("firm_cr12"),
  firmDirectorIds: text("firm_director_ids").array().notNull().default(sql`'{}'::text[]`),
  businessCertRegistration: text("business_cert_registration"),
  businessPermit: text("business_permit"),
});

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  type: text("type")
    .$type<"rent" | "sale" | "bnb" | "hotel" | "hostel">()
    .notNull(),
  price: integer("price").notNull(),
  address: text("address").notNull(),
  beds: integer("beds").notNull().default(0),
  baths: integer("baths").notNull().default(0),
  sqft: integer("sqft").notNull().default(0),
  guests: integer("guests"),
  image: text("image").notNull().default("/images/modern_apartment_exterior.png"),
  images: text("images").array().notNull().default(sql`'{}'::text[]`),
  videos: text("videos").array().notNull().default(sql`'{}'::text[]`),
  description: text("description"),
  isVerified: boolean("is_verified").notNull().default(false),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  subtype: text("subtype"),
  hourlyRate: integer("hourly_rate"),
  adminComment: text("admin_comment"),
  propertyStatus: text("property_status")
    .$type<"pending" | "approved" | "flagged">()
    .notNull()
    .default("pending"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  totalUnits: integer("total_units").notNull().default(1),
  priceUnit: text("price_unit"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id")
    .notNull()
    .references(() => properties.id),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status")
    .$type<"pending" | "confirmed" | "cancelled">()
    .notNull()
    .default("pending"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  totalPrice: integer("total_price").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type")
    .$type<"new_booking" | "booking_confirmed" | "booking_cancelled" | "booking_cancelled_by_guest" | "new_user" | "listing_submitted">()
    .notNull()
    .default("new_booking"),
  message: text("message").notNull(),
  bookingId: varchar("booking_id").references(() => bookings.id),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const favorites = pgTable(
  "favorites",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    propertyId: varchar("property_id")
      .notNull()
      .references(() => properties.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("favorites_user_property_idx").on(table.userId, table.propertyId)],
);

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  plan: text("plan")
    .$type<"free" | "basic" | "pro" | "enterprise">()
    .notNull()
    .default("free"),
  status: text("status")
    .$type<"active" | "expired" | "cancelled">()
    .notNull()
    .default("active"),
  billingCycle: text("billing_cycle")
    .$type<"monthly" | "yearly" | "custom">()
    .notNull()
    .default("monthly"),
  billingMonths: integer("billing_months").notNull().default(1),
  amountPaid: integer("amount_paid").notNull().default(0),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const subscriptionPlans = pgTable("subscription_plans", {
  name: varchar("name").primaryKey(),
  displayName: text("display_name").notNull(),
  pricePerMonth: integer("price_per_month").notNull().default(0),
  listingLimit: integer("listing_limit").notNull().default(3),
  features: text("features").array().notNull().default(sql`'{}'::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

export const settings = pgTable("settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Setting = typeof settings.$inferSelect;

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id),
  pesapalOrderId: varchar("pesapal_order_id"),
  pesapalTrackingId: varchar("pesapal_tracking_id"),
  merchantReference: varchar("merchant_reference"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("KES"),
  plan: text("plan").$type<"basic" | "pro" | "enterprise">().notNull(),
  billingMonths: integer("billing_months").notNull().default(1),
  status: text("status")
    .$type<"pending" | "completed" | "failed" | "cancelled">()
    .notNull()
    .default("pending"),
  paymentMethod: text("payment_method"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

export const propertyBlocks = pgTable("property_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PropertyBlock = typeof propertyBlocks.$inferSelect;
export type InsertPropertyBlock = typeof propertyBlocks.$inferInsert;

export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar("phone").notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type OtpCode = typeof otpCodes.$inferSelect;

export const insertUserSchema = createInsertSchema(users)
  .pick({ name: true, email: true, password: true, role: true })
  .extend({
    role: z.enum(["owner", "tenant", "admin", "host", "guest"]).optional(),
  });

const latLngField = z.preprocess(
  v => (v != null && v !== "" ? String(v) : undefined),
  z.string().optional()
);

export const insertPropertySchema = createInsertSchema(properties)
  .omit({ id: true, createdAt: true })
  .extend({
    type: z.enum(["rent", "sale", "bnb", "hotel", "hostel"]),
    title: z.string().min(1, "Title is required"),
    address: z.string().min(1, "Address is required"),
    price: z.number().int().positive("Price must be greater than 0"),
    beds: z.number().int().min(0, "Bedrooms cannot be negative"),
    baths: z.number().int().min(0, "Bathrooms cannot be negative"),
    sqft: z.number().int().min(0, "Square footage cannot be negative"),
    totalUnits: z.number().int().min(1, "Must have at least 1 unit").optional().default(1),
    lat: latLngField,
    lng: latLngField,
  });

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export const contactInquiries = pgTable("contact_inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").$type<"new" | "read" | "replied">().notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContactInquirySchema = createInsertSchema(contactInquiries).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type InsertContactInquiry = z.infer<typeof insertContactInquirySchema>;
export type ContactInquiry = typeof contactInquiries.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;
