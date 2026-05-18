import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  decimal,
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
  description: text("description"),
  isVerified: boolean("is_verified").notNull().default(false),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
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
    .$type<"new_booking">()
    .notNull()
    .default("new_booking"),
  message: text("message").notNull(),
  bookingId: varchar("booking_id").references(() => bookings.id),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  propertyId: varchar("property_id")
    .notNull()
    .references(() => properties.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const insertUserSchema = createInsertSchema(users)
  .pick({ name: true, email: true, password: true, role: true })
  .extend({
    role: z.enum(["owner", "tenant", "admin", "host", "guest"]).optional(),
  });

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
  });

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;
