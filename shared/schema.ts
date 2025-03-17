import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define common types
export type MasterCategory = 'MTN Fixed' | 'MTN GSM';
export type ProductStatus = 'active' | 'limited' | 'outofstock';
export type UserProductStatus = 'active' | 'pending' | 'suspended' | 'cancelled';

// User model with roles
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("reseller"),
  creditBalance: decimal("credit_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  resellerGroup: integer("reseller_group").default(1),
  paymentMode: text("payment_mode").default("credit"), // 'credit' or 'debit'
  dashboardConfig: jsonb("dashboard_config"),
  createdAt: timestamp("created_at").defaultNow()
});

// Product categories
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  masterCategory: text("master_category").notNull(), // MTN Fixed or MTN GSM
  description: text("description"),
  parentId: integer("parent_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  group1Price: decimal("group1_price", { precision: 10, scale: 2 }).notNull(),
  group2Price: decimal("group2_price", { precision: 10, scale: 2 }).notNull(),
  categoryId: integer("category_id").notNull(),
  status: text("status").notNull().default("active"),
  apiEndpoint: text("api_endpoint"), // Endpoint for Broadband.is API
  createdAt: timestamp("created_at").defaultNow()
});

// Clients
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  resellerId: integer("reseller_id").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Client Products (Subscriptions)
export const clientProducts = pgTable("client_products", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  productId: integer("product_id").notNull(),
  status: text("status").notNull().default("active"),
  lastBilledDate: timestamp("last_billed_date").defaultNow(),
  nextBillingDate: timestamp("next_billing_date"),
  createdAt: timestamp("created_at").defaultNow()
});

// API Integration Settings
export const apiSettings = pgTable("api_settings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  endpoint: text("endpoint").notNull(),
  masterCategory: text("master_category").notNull(), // MTN Fixed or MTN GSM
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// User Products
export const userProducts = pgTable("user_products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  username: text("username"), // Username for product/service
  msisdn: text("msisdn"), // MSISDN if applicable
  comments: text("comments"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow()
});

// User Product Endpoints
export const userProductEndpoints = pgTable("user_product_endpoints", {
  id: serial("id").primaryKey(),
  userProductId: integer("user_product_id").notNull(),
  apiSettingId: integer("api_setting_id").notNull(),
  endpointPath: text("endpoint_path").notNull(), // Path like /rest/lte/usernameInfo.php
  customParameters: jsonb("custom_parameters"),
  createdAt: timestamp("created_at").defaultNow()
});

// Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // credit, debit
  createdAt: timestamp("created_at").defaultNow()
});

// Schemas for inserting data
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, dashboardConfig: true });
export const insertProductCategorySchema = createInsertSchema(productCategories).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertClientProductSchema = createInsertSchema(clientProducts).omit({ id: true, createdAt: true });
export const insertApiSettingSchema = createInsertSchema(apiSettings).omit({ id: true, createdAt: true });
export const insertUserProductSchema = createInsertSchema(userProducts).omit({ id: true, createdAt: true });
export const insertUserProductEndpointSchema = createInsertSchema(userProductEndpoints).omit({ id: true, createdAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });

// Types for selections
export type User = typeof users.$inferSelect;
export type ProductCategory = typeof productCategories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type ClientProduct = typeof clientProducts.$inferSelect;
export type ApiSetting = typeof apiSettings.$inferSelect;
export type UserProduct = typeof userProducts.$inferSelect;
export type UserProductEndpoint = typeof userProductEndpoints.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;

// Types for inserts
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertClientProduct = z.infer<typeof insertClientProductSchema>;
export type InsertApiSetting = z.infer<typeof insertApiSettingSchema>;
export type InsertUserProduct = z.infer<typeof insertUserProductSchema>;
export type InsertUserProductEndpoint = z.infer<typeof insertUserProductEndpointSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
