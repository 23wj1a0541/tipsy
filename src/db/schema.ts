import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';



// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  role: text("role", { enum: ["admin", "owner", "worker"] }).default("owner"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// Add feature toggles table
export const featureToggles = sqliteTable('feature_toggles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  label: text('label').notNull(),
  enabled: integer('enabled').notNull().default(0),
  audience: text('audience').notNull().default('all'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Add product domain tables
export const restaurants = sqliteTable('restaurants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerUserId: text('owner_user_id').notNull().references(() => user.id),
  name: text('name').notNull(),
  upiId: text('upi_id').notNull(),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

export const staffMembers = sqliteTable('staff_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').references(() => user.id),
  restaurantId: integer('restaurant_id').notNull().references(() => restaurants.id),
  displayName: text('display_name').notNull(),
  role: text('role', { enum: ['server', 'chef', 'host', 'manager'] }).default('server').notNull(),
  status: text('status', { enum: ['active', 'inactive'] }).default('active').notNull(),
  qrKey: text('qr_key').unique().notNull(),
  upiId: text('upi_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

export const tips = sqliteTable('tips', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  staffMemberId: integer('staff_member_id').notNull().references(() => staffMembers.id),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').default('INR').notNull(),
  payerName: text('payer_name'),
  message: text('message'),
  source: text('source', { enum: ['qr', 'link', 'pos'] }).default('qr').notNull(),
  status: text('status', { enum: ['succeeded', 'pending', 'failed'] }).default('succeeded').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  staffMemberId: integer('staff_member_id').notNull().references(() => staffMembers.id),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  tipId: integer('tip_id').references(() => tips.id),
  approved: integer('approved', { mode: 'boolean' }).default(true).notNull(),
  approvedBy: text('approved_by').references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});