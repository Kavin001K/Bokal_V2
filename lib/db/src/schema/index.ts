import {
  pgTable,
  text,
  boolean,
  timestamp,
  decimal,
  integer,
  jsonb,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("employee"),
  isActive: boolean("is_active").notNull().default(true),
  mustChangePw: boolean("must_change_pw").notNull().default(false),
  phoneNumber: text("phone_number"),
  dateOfBirth: text("date_of_birth"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const venuesTable = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  pricePerHour: decimal("price_per_hour", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
});

export const insertVenueSchema = createInsertSchema(venuesTable).omit({
  id: true,
});
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type Venue = typeof venuesTable.$inferSelect;

export const bookingsTable = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingRef: text("booking_ref").notNull().unique(),
    customerName: text("customer_name").notNull(),
    phoneNumbers: jsonb("phone_numbers").notNull().default("[]"),
    address: text("address"),
    idProofUrl: text("id_proof_url"),
    bookingDate: text("booking_date").notNull(),
    tamilDateLabel: text("tamil_date_label"),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    durationHours: decimal("duration_hours", { precision: 4, scale: 2 }).notNull(),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    advanceAmount: decimal("advance_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    isPaid: boolean("is_paid").notNull().default(false),
    notes: text("notes"),
    status: text("status").notNull().default("confirmed"),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => usersTable.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at"),
    cancelledById: uuid("cancelled_by_id").references(() => usersTable.id),
    cancelReason: text("cancel_reason"),
  },
  (table) => ({
    bookingDateIdx: index("booking_date_idx").on(table.bookingDate),
    statusIdx: index("status_idx").on(table.status),
    customerNameIdx: index("customer_name_idx").on(table.customerName),
    createdByIdIdx: index("created_by_id_idx").on(table.createdById),
  })
);

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;

export const bookingVenuesTable = pgTable(
  "booking_venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookingsTable.id, { onDelete: "cascade" }),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venuesTable.id),
    pricePerHour: decimal("price_per_hour", { precision: 10, scale: 2 }).notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  },
  (table) => ({
    bookingIdIdx: index("booking_id_idx").on(table.bookingId),
    venueIdIdx: index("venue_id_idx").on(table.venueId),
  })
);

export const insertBookingVenueSchema = createInsertSchema(bookingVenuesTable).omit({ id: true });
export type InsertBookingVenue = z.infer<typeof insertBookingVenueSchema>;
export type BookingVenue = typeof bookingVenuesTable.$inferSelect;

export const settingsTable = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Setting = typeof settingsTable.$inferSelect;

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    details: jsonb("details"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
  })
);

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;

export const bookingPdfsTable = pgTable("booking_pdfs", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookingsTable.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  pdfData: text("pdf_data").notNull(),
  fileSize: integer("file_size").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookingPdfSchema = createInsertSchema(bookingPdfsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBookingPdf = z.infer<typeof insertBookingPdfSchema>;
export type BookingPdf = typeof bookingPdfsTable.$inferSelect;
