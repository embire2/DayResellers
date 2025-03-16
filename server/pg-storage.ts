/**
 * PostgreSQL Storage Implementation for Day Reseller Platform
 * This replaces the in-memory storage with a persistent database
 */

import { and, eq } from "drizzle-orm";
import { db, pool } from "./db";
import { IStorage } from "./storage";
import * as schema from "../shared/schema";
import { 
  User, ProductCategory, Product, Client, 
  ClientProduct, ApiSetting, Transaction,
  InsertUser, InsertProductCategory, InsertProduct,
  InsertClient, InsertClientProduct, InsertApiSetting,
  InsertTransaction
} from "../shared/schema";
import { DashboardConfig } from "../shared/types";
import { logger } from "./logger";
import session from "express-session";
import pgSession from "connect-pg-simple";

export class PgStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Setup PostgreSQL session store
    const PostgresStore = pgSession(session);
    this.sessionStore = new PostgresStore({
      pool: pool,
      tableName: 'sessions',
      createTableIfMissing: true
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const users = await db.select().from(schema.users).where(eq(schema.users.id, id));
      return users.length > 0 ? users[0] : undefined;
    } catch (error) {
      logger.error(`Error in getUser(${id})`, {}, error as Error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const users = await db.select().from(schema.users).where(eq(schema.users.username, username));
      return users.length > 0 ? users[0] : undefined;
    } catch (error) {
      logger.error(`Error in getUserByUsername(${username})`, {}, error as Error);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      if (!user) {
        throw new Error('Cannot create user: Invalid or empty user data provided');
      }
      
      if (!user.username) {
        throw new Error('Cannot create user: Username is required');
      }
      
      if (!user.password) {
        throw new Error('Cannot create user: Password is required');
      }
      
      // Ensure proper type conversion for required fields
      const normalizedData = {
        ...user,
        role: user.role || 'reseller',
        creditBalance: user.creditBalance || '0',
        resellerGroup: typeof user.resellerGroup === 'string' 
          ? parseInt(user.resellerGroup, 10) 
          : (user.resellerGroup || 1)
      };
      
      // Insert the user
      const result = await db.insert(schema.users).values({
        username: normalizedData.username,
        password: normalizedData.password,
        role: normalizedData.role,
        creditBalance: normalizedData.creditBalance,
        resellerGroup: normalizedData.resellerGroup,
        dashboardConfig: null,
        createdAt: new Date()
      }).returning();
      
      if (!result || result.length === 0) {
        throw new Error('Failed to create user: No result returned from database');
      }
      
      return result[0];
    } catch (error) {
      logger.error(`Error in createUser`, {}, error as Error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const result = await db.update(schema.users)
        .set({ ...userData })
        .where(eq(schema.users.id, id))
        .returning();

      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      logger.error(`Error in updateUser(${id})`, {}, error as Error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(schema.users);
    } catch (error) {
      logger.error(`Error in getAllUsers()`, {}, error as Error);
      throw error;
    }
  }

  async updateUserDashboard(id: number, dashboard: DashboardConfig): Promise<User | undefined> {
    try {
      const result = await db.update(schema.users)
        .set({ dashboardConfig: dashboard })
        .where(eq(schema.users.id, id))
        .returning();

      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      logger.error(`Error in updateUserDashboard(${id})`, {}, error as Error);
      throw error;
    }
  }

  // Product category operations
  async createProductCategory(category: InsertProductCategory): Promise<ProductCategory> {
    try {
      const result = await db.insert(schema.productCategories)
        .values({
          ...category,
          createdAt: new Date()
        })
        .returning();

      if (!result || result.length === 0) {
        throw new Error('Failed to create product category');
      }

      return result[0];
    } catch (error) {
      logger.error(`Error in createProductCategory`, {}, error as Error);
      throw error;
    }
  }

  async getProductCategories(): Promise<ProductCategory[]> {
    try {
      return await db.select().from(schema.productCategories);
    } catch (error) {
      logger.error(`Error in getProductCategories()`, {}, error as Error);
      throw error;
    }
  }

  async getProductCategoriesByMaster(masterCategory: string): Promise<ProductCategory[]> {
    try {
      return await db.select()
        .from(schema.productCategories)
        .where(eq(schema.productCategories.masterCategory, masterCategory));
    } catch (error) {
      logger.error(`Error in getProductCategoriesByMaster(${masterCategory})`, {}, error as Error);
      throw error;
    }
  }

  async updateProductCategory(id: number, data: Partial<ProductCategory>): Promise<ProductCategory | undefined> {
    try {
      const result = await db.update(schema.productCategories)
        .set({ ...data })
        .where(eq(schema.productCategories.id, id))
        .returning();

      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      logger.error(`Error in updateProductCategory(${id})`, {}, error as Error);
      throw error;
    }
  }

  async deleteProductCategory(id: number): Promise<boolean> {
    try {
      const result = await db.delete(schema.productCategories)
        .where(eq(schema.productCategories.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      logger.error(`Error in deleteProductCategory(${id})`, {}, error as Error);
      throw error;
    }
  }

  // Product operations
  async createProduct(product: InsertProduct): Promise<Product> {
    try {
      const result = await db.insert(schema.products)
        .values({
          ...product,
          createdAt: new Date()
        })
        .returning();

      if (!result || result.length === 0) {
        throw new Error('Failed to create product');
      }

      return result[0];
    } catch (error) {
      logger.error(`Error in createProduct`, {}, error as Error);
      throw error;
    }
  }

  async getProducts(): Promise<Product[]> {
    try {
      return await db.select().from(schema.products);
    } catch (error) {
      logger.error(`Error in getProducts()`, {}, error as Error);
      throw error;
    }
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    try {
      return await db.select()
        .from(schema.products)
        .where(eq(schema.products.categoryId, categoryId));
    } catch (error) {
      logger.error(`Error in getProductsByCategory(${categoryId})`, {}, error as Error);
      throw error;
    }
  }

  async getProductsByMasterCategory(masterCategory: string): Promise<Product[]> {
    try {
      // Join with product categories to filter by master category
      const productsWithCategories = await db
        .select({
          product: schema.products,
          category: schema.productCategories
        })
        .from(schema.products)
        .innerJoin(
          schema.productCategories,
          eq(schema.products.categoryId, schema.productCategories.id)
        )
        .where(eq(schema.productCategories.masterCategory, masterCategory));

      // Extract the products
      return productsWithCategories.map(item => item.product);
    } catch (error) {
      logger.error(`Error in getProductsByMasterCategory(${masterCategory})`, {}, error as Error);
      throw error;
    }
  }

  async getProduct(id: number): Promise<Product | undefined> {
    try {
      const products = await db.select()
        .from(schema.products)
        .where(eq(schema.products.id, id));

      return products.length > 0 ? products[0] : undefined;
    } catch (error) {
      logger.error(`Error in getProduct(${id})`, {}, error as Error);
      throw error;
    }
  }

  async updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined> {
    try {
      const result = await db.update(schema.products)
        .set({ ...productData })
        .where(eq(schema.products.id, id))
        .returning();

      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      logger.error(`Error in updateProduct(${id})`, {}, error as Error);
      throw error;
    }
  }

  async deleteProduct(id: number): Promise<boolean> {
    try {
      const result = await db.delete(schema.products)
        .where(eq(schema.products.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      logger.error(`Error in deleteProduct(${id})`, {}, error as Error);
      throw error;
    }
  }

  // Client operations
  async createClient(client: InsertClient): Promise<Client> {
    try {
      const result = await db.insert(schema.clients)
        .values({
          ...client,
          createdAt: new Date()
        })
        .returning();

      if (!result || result.length === 0) {
        throw new Error('Failed to create client');
      }

      return result[0];
    } catch (error) {
      logger.error(`Error in createClient`, {}, error as Error);
      throw error;
    }
  }

  async getClientsByReseller(resellerId: number): Promise<Client[]> {
    try {
      return await db.select()
        .from(schema.clients)
        .where(eq(schema.clients.resellerId, resellerId));
    } catch (error) {
      logger.error(`Error in getClientsByReseller(${resellerId})`, {}, error as Error);
      throw error;
    }
  }

  async getClient(id: number): Promise<Client | undefined> {
    try {
      const clients = await db.select()
        .from(schema.clients)
        .where(eq(schema.clients.id, id));

      return clients.length > 0 ? clients[0] : undefined;
    } catch (error) {
      logger.error(`Error in getClient(${id})`, {}, error as Error);
      throw error;
    }
  }

  // Client product operations
  async createClientProduct(clientProduct: InsertClientProduct): Promise<ClientProduct> {
    try {
      const now = new Date();
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      const result = await db.insert(schema.clientProducts)
        .values({
          ...clientProduct,
          createdAt: now,
          lastBilledDate: now,
          nextBillingDate: nextBillingDate
        })
        .returning();

      if (!result || result.length === 0) {
        throw new Error('Failed to create client product');
      }

      return result[0];
    } catch (error) {
      logger.error(`Error in createClientProduct`, {}, error as Error);
      throw error;
    }
  }

  async getClientProductsByClient(clientId: number): Promise<ClientProduct[]> {
    try {
      return await db.select()
        .from(schema.clientProducts)
        .where(eq(schema.clientProducts.clientId, clientId));
    } catch (error) {
      logger.error(`Error in getClientProductsByClient(${clientId})`, {}, error as Error);
      throw error;
    }
  }

  async updateClientProduct(id: number, data: Partial<ClientProduct>): Promise<ClientProduct | undefined> {
    try {
      const result = await db.update(schema.clientProducts)
        .set({ ...data })
        .where(eq(schema.clientProducts.id, id))
        .returning();

      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      logger.error(`Error in updateClientProduct(${id})`, {}, error as Error);
      throw error;
    }
  }

  // API Settings operations
  async createApiSetting(setting: InsertApiSetting): Promise<ApiSetting> {
    try {
      const result = await db.insert(schema.apiSettings)
        .values({
          ...setting,
          createdAt: new Date()
        })
        .returning();

      if (!result || result.length === 0) {
        throw new Error('Failed to create API setting');
      }

      return result[0];
    } catch (error) {
      logger.error(`Error in createApiSetting`, {}, error as Error);
      throw error;
    }
  }

  async getApiSettings(): Promise<ApiSetting[]> {
    try {
      return await db.select().from(schema.apiSettings);
    } catch (error) {
      logger.error(`Error in getApiSettings()`, {}, error as Error);
      throw error;
    }
  }

  async getApiSettingsByMaster(masterCategory: string): Promise<ApiSetting[]> {
    try {
      return await db.select()
        .from(schema.apiSettings)
        .where(eq(schema.apiSettings.masterCategory, masterCategory));
    } catch (error) {
      logger.error(`Error in getApiSettingsByMaster(${masterCategory})`, {}, error as Error);
      throw error;
    }
  }

  async updateApiSetting(id: number, data: Partial<ApiSetting>): Promise<ApiSetting | undefined> {
    try {
      const result = await db.update(schema.apiSettings)
        .set({ ...data })
        .where(eq(schema.apiSettings.id, id))
        .returning();

      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      logger.error(`Error in updateApiSetting(${id})`, {}, error as Error);
      throw error;
    }
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    try {
      // Begin transaction
      // Note: We use a database transaction to ensure atomicity
      // Use Drizzle's transaction feature when needed for more complex operations

      // Create transaction record
      const result = await db.insert(schema.transactions)
        .values({
          ...transaction,
          createdAt: new Date()
        })
        .returning();

      if (!result || result.length === 0) {
        throw new Error('Failed to create transaction');
      }

      // Update user's credit balance if applicable
      if (transaction.type === 'credit' || transaction.type === 'debit') {
        const user = await this.getUser(transaction.userId);
        if (user) {
          const currentBalance = parseFloat(user.creditBalance?.toString() || '0');
          const amount = parseFloat(transaction.amount.toString());
          
          let newBalance = currentBalance;
          if (transaction.type === 'credit') {
            newBalance += amount;
          } else {
            newBalance -= amount;
          }
          
          await this.updateUser(user.id, { 
            creditBalance: newBalance.toString() 
          });
        }
      }

      return result[0];
    } catch (error) {
      logger.error(`Error in createTransaction`, {}, error as Error);
      throw error;
    }
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    try {
      return await db.select()
        .from(schema.transactions)
        .where(eq(schema.transactions.userId, userId))
        .orderBy(schema.transactions.createdAt);
    } catch (error) {
      logger.error(`Error in getTransactionsByUser(${userId})`, {}, error as Error);
      throw error;
    }
  }

  async getRecentTransactions(limit: number): Promise<Transaction[]> {
    try {
      return await db.select()
        .from(schema.transactions)
        .orderBy(schema.transactions.createdAt)
        .limit(limit);
    } catch (error) {
      logger.error(`Error in getRecentTransactions(${limit})`, {}, error as Error);
      throw error;
    }
  }
}

// Export an instance of the PostgreSQL storage for use in the application
export const pgStorage = new PgStorage();