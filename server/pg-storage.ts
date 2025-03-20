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
  InsertTransaction, UserProduct, InsertUserProduct,
  UserProductEndpoint, InsertUserProductEndpoint,
  ProductOrder, InsertProductOrder
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
  
  // User Product operations
  async createUserProduct(userProduct: InsertUserProduct): Promise<UserProduct> {
    try {
      // VERBOSE: Log detailed info about the operation
      logger.debug("PgStorage.createUserProduct - Beginning creation", {
        userProductData: userProduct,
        timestamp: new Date().toISOString()
      });
      
      const result = await db.insert(schema.userProducts).values(userProduct).returning();
      
      // VERBOSE: Log the result of the operation
      logger.debug("PgStorage.createUserProduct - Operation completed", {
        success: result.length > 0,
        resultCount: result.length,
        createdProduct: result.length > 0 ? result[0] : null,
        timestamp: new Date().toISOString()
      });
      
      if (!result || result.length === 0) {
        throw new Error("User product was not created - database returned empty result");
      }
      
      return result[0];
    } catch (error: any) {
      // VERBOSE: Enhanced error logging
      logger.error("PgStorage.createUserProduct - Failed to create user product", { 
        error,
        errorMessage: error.message || "Unknown error",
        errorCode: error.code,
        errorDetail: error.detail,
        errorConstraint: error.constraint,
        userProductData: userProduct,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async getUserProducts(): Promise<UserProduct[]> {
    try {
      return await db.select().from(schema.userProducts);
    } catch (error) {
      logger.error("Failed to get user products", { error });
      throw error;
    }
  }

  async getUserProductsByUser(userId: number): Promise<UserProduct[]> {
    try {
      // VERBOSE: Log the operation attempt
      logger.debug("PgStorage.getUserProductsByUser - Beginning retrieval", {
        userId,
        timestamp: new Date().toISOString()
      });
      
      // Always use direct SQL query for consistency
      logger.debug("PgStorage.getUserProductsByUser - Using direct SQL query", {
        userId,
        queryText: 'SELECT * FROM user_products WHERE user_id = $1',
        parameters: [userId]
      });
      
      // Direct query to get data from PostgreSQL
      const { rows } = await pool.query(
        'SELECT * FROM user_products WHERE user_id = $1',
        [userId]
      );
      
      // Log raw database results at debug level for troubleshooting
      logger.warn("PgStorage.getUserProductsByUser - Raw DB results", {
        userId,
        rowCount: rows.length,
        rowData: JSON.stringify(rows)
      });
      
      // Transform the results to match the expected schema format - snake_case to camelCase mapping
      const transformedProducts = rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        productId: row.product_id,
        username: row.username,
        msisdn: row.msisdn,
        comments: row.comments,
        status: row.status,
        createdAt: row.created_at
      }));
      
      // Log transformed results at debug level
      logger.warn("PgStorage.getUserProductsByUser - Transformed results", {
        userId,
        transformedCount: transformedProducts.length,
        transformedData: JSON.stringify(transformedProducts)
      });
      
      // Return the transformed products
      return transformedProducts;
    } catch (error: any) {
      // Enhanced error logging
      logger.error("PgStorage.getUserProductsByUser - Failed to get user products by user", { 
        error,
        errorMessage: error.message || "Unknown error",
        errorCode: error.code,
        errorDetail: error.detail,
        userId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async getUserProduct(id: number): Promise<UserProduct | undefined> {
    try {
      // Use direct SQL query with transformation
      logger.debug("PgStorage.getUserProduct - Using direct SQL query", {
        id,
        timestamp: new Date().toISOString()
      });
      
      const { rows } = await pool.query(
        'SELECT * FROM user_products WHERE id = $1',
        [id]
      );
      
      if (rows.length === 0) {
        return undefined;
      }
      
      // Transform the result to match the expected schema format
      const row = rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        productId: row.product_id,
        username: row.username,
        msisdn: row.msisdn,
        comments: row.comments,
        status: row.status,
        createdAt: row.created_at
      };
    } catch (error) {
      logger.error("Failed to get user product", { error, id });
      throw error;
    }
  }

  async updateUserProduct(id: number, data: Partial<UserProduct>): Promise<UserProduct | undefined> {
    try {
      // Transform camelCase data keys to snake_case for SQL
      const sqlData: Record<string, any> = {};
      
      if (data.userId !== undefined) sqlData.user_id = data.userId;
      if (data.productId !== undefined) sqlData.product_id = data.productId;
      if (data.username !== undefined) sqlData.username = data.username;
      if (data.msisdn !== undefined) sqlData.msisdn = data.msisdn;
      if (data.comments !== undefined) sqlData.comments = data.comments;
      if (data.status !== undefined) sqlData.status = data.status;
      
      // Generate SET clause for SQL
      const setClauses = Object.keys(sqlData).map(key => `${key} = $${Object.keys(sqlData).indexOf(key) + 2}`);
      if (setClauses.length === 0) {
        return await this.getUserProduct(id); // Nothing to update
      }
      
      const setClause = setClauses.join(', ');
      const values = Object.values(sqlData);
      
      // Construct and execute SQL query
      const query = `
        UPDATE user_products 
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;
      
      logger.debug("PgStorage.updateUserProduct - Using direct SQL query", {
        id,
        setClause,
        values: [id, ...values]
      });
      
      const { rows } = await pool.query(query, [id, ...values]);
      
      if (rows.length === 0) {
        return undefined;
      }
      
      // Transform the result to match the expected schema format
      const row = rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        productId: row.product_id,
        username: row.username,
        msisdn: row.msisdn,
        comments: row.comments,
        status: row.status,
        createdAt: row.created_at
      };
    } catch (error) {
      logger.error("Failed to update user product", { error, id });
      throw error;
    }
  }

  async deleteUserProduct(id: number): Promise<boolean> {
    try {
      // Use direct SQL query for consistency
      logger.debug("PgStorage.deleteUserProduct - Using direct SQL query", {
        id,
        timestamp: new Date().toISOString()
      });
      
      const result = await pool.query(
        'DELETE FROM user_products WHERE id = $1',
        [id]
      );
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logger.error("Failed to delete user product", { error, id });
      throw error;
    }
  }

  // User Product Endpoint operations
  async createUserProductEndpoint(endpoint: InsertUserProductEndpoint): Promise<UserProductEndpoint> {
    try {
      const result = await db.insert(schema.userProductEndpoints).values(endpoint).returning();
      return result[0];
    } catch (error) {
      logger.error("Failed to create user product endpoint", { error });
      throw error;
    }
  }

  async getUserProductEndpoints(userProductId: number): Promise<UserProductEndpoint[]> {
    try {
      return await db.select().from(schema.userProductEndpoints)
        .where(eq(schema.userProductEndpoints.userProductId, userProductId));
    } catch (error) {
      logger.error("Failed to get user product endpoints", { error, userProductId });
      throw error;
    }
  }
  
  async getUserProductEndpoint(id: number): Promise<UserProductEndpoint | undefined> {
    try {
      const result = await db.select().from(schema.userProductEndpoints)
        .where(eq(schema.userProductEndpoints.id, id));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      logger.error("Failed to get user product endpoint by ID", { error, id });
      throw error;
    }
  }

  async updateUserProductEndpoint(id: number, data: Partial<UserProductEndpoint>): Promise<UserProductEndpoint | undefined> {
    try {
      const updated = await db.update(schema.userProductEndpoints)
        .set(data)
        .where(eq(schema.userProductEndpoints.id, id))
        .returning();
      return updated.length > 0 ? updated[0] : undefined;
    } catch (error) {
      logger.error("Failed to update user product endpoint", { error, id });
      throw error;
    }
  }

  async deleteUserProductEndpoint(id: number): Promise<boolean> {
    try {
      await db.delete(schema.userProductEndpoints)
        .where(eq(schema.userProductEndpoints.id, id));
      return true;
    } catch (error) {
      logger.error("Failed to delete user product endpoint", { error, id });
      throw error;
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      // VERBOSE: Log beginning of operation
      logger.debug(`PgStorage.getUser - Looking up user with ID: ${id}`, {
        userId: id,
        timestamp: new Date().toISOString()
      });
      
      // Use direct SQL query for consistency and better debugging
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      
      // Log the results
      logger.debug(`PgStorage.getUser - SQL query result for user ID ${id}`, {
        rowCount: rows.length,
        userFound: rows.length > 0,
        userData: rows.length > 0 ? {
          id: rows[0].id,
          username: rows[0].username,
          role: rows[0].role,
          paymentMode: rows[0].payment_mode
        } : null
      });
      
      if (rows.length === 0) {
        return undefined;
      }
      
      // Map snake_case to camelCase
      const row = rows[0];
      const user: User = {
        id: row.id,
        username: row.username,
        password: row.password,
        role: row.role,
        creditBalance: row.credit_balance,
        resellerGroup: row.reseller_group,
        paymentMode: row.payment_mode,
        dashboardConfig: row.dashboard_config,
        createdAt: row.created_at
      };
      
      return user;
    } catch (error) {
      logger.error(`Error in getUser(${id})`, {}, error as Error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      // VERBOSE: Log beginning of operation
      logger.debug(`PgStorage.getUserByUsername - Looking up user with username: ${username}`, {
        username,
        timestamp: new Date().toISOString()
      });
      
      // Use direct SQL query for consistency
      const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      
      // Log the results
      logger.debug(`PgStorage.getUserByUsername - SQL query result for username ${username}`, {
        rowCount: rows.length,
        userFound: rows.length > 0,
        userData: rows.length > 0 ? {
          id: rows[0].id,
          username: rows[0].username,
          role: rows[0].role,
          paymentMode: rows[0].payment_mode
        } : null
      });
      
      if (rows.length === 0) {
        return undefined;
      }
      
      // Map snake_case to camelCase
      const row = rows[0];
      const user: User = {
        id: row.id,
        username: row.username,
        password: row.password,
        role: row.role,
        creditBalance: row.credit_balance,
        resellerGroup: row.reseller_group,
        paymentMode: row.payment_mode,
        dashboardConfig: row.dashboard_config,
        createdAt: row.created_at
      };
      
      return user;
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
  
  async getApiSetting(id: number): Promise<ApiSetting | undefined> {
    try {
      const settings = await db.select()
        .from(schema.apiSettings)
        .where(eq(schema.apiSettings.id, id));
      
      return settings.length > 0 ? settings[0] : undefined;
    } catch (error) {
      logger.error(`Error in getApiSetting(${id})`, {}, error as Error);
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

  // Product Orders operations
  async createProductOrder(order: InsertProductOrder): Promise<ProductOrder> {
    try {
      logger.debug("PgStorage.createProductOrder - Beginning creation", {
        orderData: order,
        timestamp: new Date().toISOString()
      });
      
      const result = await db.insert(schema.productOrders).values(order).returning();
      
      logger.debug("PgStorage.createProductOrder - Operation completed", {
        success: result.length > 0,
        resultCount: result.length,
        createdOrder: result.length > 0 ? result[0] : null,
        timestamp: new Date().toISOString()
      });
      
      if (!result || result.length === 0) {
        throw new Error("Product order was not created - database returned empty result");
      }
      
      return result[0];
    } catch (error: any) {
      logger.error("PgStorage.createProductOrder - Failed to create product order", { 
        error,
        errorMessage: error.message || "Unknown error",
        errorCode: error.code,
        errorDetail: error.detail,
        errorConstraint: error.constraint,
        orderData: order,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
  
  async getProductOrders(): Promise<ProductOrder[]> {
    try {
      return await db.select().from(schema.productOrders);
    } catch (error) {
      logger.error("Failed to get product orders", { error });
      throw error;
    }
  }
  
  async getProductOrdersByReseller(resellerId: number): Promise<ProductOrder[]> {
    try {
      return await db.select()
        .from(schema.productOrders)
        .where(eq(schema.productOrders.resellerId, resellerId));
    } catch (error) {
      logger.error("Failed to get product orders by reseller", { error, resellerId });
      throw error;
    }
  }
  
  async getProductOrder(id: number): Promise<ProductOrder | undefined> {
    try {
      const result = await db.select().from(schema.productOrders)
        .where(eq(schema.productOrders.id, id));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      logger.error("Failed to get product order by ID", { error, id });
      throw error;
    }
  }
  
  async updateProductOrder(id: number, data: Partial<ProductOrder>): Promise<ProductOrder | undefined> {
    try {
      // If order status is changing to 'active', create a user product automatically
      const order = await this.getProductOrder(id);
      if (order && data.status === 'active' && order.status !== 'active') {
        // Create a user product entry for the approved order
        await this.createUserProduct({
          userId: order.resellerId,
          productId: order.productId,
          status: 'active',
          // Transfer over SIM number if it exists
          msisdn: order.simNumber,
          comments: `Auto-created from order #${id}`
        });
      }
      
      const updated = await db.update(schema.productOrders)
        .set(data)
        .where(eq(schema.productOrders.id, id))
        .returning();
      return updated.length > 0 ? updated[0] : undefined;
    } catch (error) {
      logger.error("Failed to update product order", { error, id });
      throw error;
    }
  }
  
  async getPendingProductOrders(): Promise<ProductOrder[]> {
    try {
      return await db.select()
        .from(schema.productOrders)
        .where(eq(schema.productOrders.status, 'pending'));
    } catch (error) {
      logger.error("Failed to get pending product orders", { error });
      throw error;
    }
  }
  
  async getProductOrdersWithDetails(): Promise<any[]> {
    try {
      // Use direct SQL for a more efficient JOIN query
      const { rows } = await pool.query(`
        SELECT o.*, 
               p.id as product_id, p.name as product_name, p.base_price,
               c.id as client_id, c.name as client_name,
               u.id as reseller_id, u.username as reseller_username
        FROM product_orders o
        JOIN products p ON o.product_id = p.id
        JOIN clients c ON o.client_id = c.id
        JOIN users u ON o.reseller_id = u.id
      `);
      
      // Transform the results to match the expected output structure
      return rows.map(row => ({
        id: row.id,
        resellerId: row.reseller_id,
        clientId: row.client_id,
        productId: row.product_id,
        status: row.status,
        provisionMethod: row.provision_method,
        simNumber: row.sim_number,
        address: row.address,
        contactName: row.contact_name,
        contactPhone: row.contact_phone,
        country: row.country,
        rejectionReason: row.rejection_reason,
        createdAt: row.created_at,
        product: {
          id: row.product_id,
          name: row.product_name,
          basePrice: row.base_price
        },
        client: {
          id: row.client_id,
          name: row.client_name
        },
        reseller: {
          id: row.reseller_id,
          username: row.reseller_username
        }
      }));
    } catch (error) {
      logger.error("Failed to get product orders with details", { error });
      throw error;
    }
  }
}

// Export an instance of the PostgreSQL storage for use in the application
export const pgStorage = new PgStorage();