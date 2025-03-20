import { 
  users, type User, type InsertUser,
  productCategories, type ProductCategory, type InsertProductCategory,
  products, type Product, type InsertProduct,
  clients, type Client, type InsertClient,
  clientProducts, type ClientProduct, type InsertClientProduct,
  apiSettings, type ApiSetting, type InsertApiSetting,
  userProducts, type UserProduct, type InsertUserProduct,
  userProductEndpoints, type UserProductEndpoint, type InsertUserProductEndpoint,
  transactions, type Transaction, type InsertTransaction,
  productOrders, type ProductOrder, type InsertProductOrder
} from "@shared/schema";
import { DashboardConfig } from "@shared/types";
import session, { Store } from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUserDashboard(id: number, dashboard: DashboardConfig): Promise<User | undefined>;
  
  // Product category operations
  createProductCategory(category: InsertProductCategory): Promise<ProductCategory>;
  getProductCategories(): Promise<ProductCategory[]>;
  getProductCategoriesByMaster(masterCategory: string): Promise<ProductCategory[]>;
  updateProductCategory(id: number, data: Partial<ProductCategory>): Promise<ProductCategory | undefined>;
  deleteProductCategory(id: number): Promise<boolean>;
  
  // Product operations
  createProduct(product: InsertProduct): Promise<Product>;
  getProducts(): Promise<Product[]>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  getProductsByMasterCategory(masterCategory: string): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  
  // Client operations
  createClient(client: InsertClient): Promise<Client>;
  getClientsByReseller(resellerId: number): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  
  // Client product operations
  createClientProduct(clientProduct: InsertClientProduct): Promise<ClientProduct>;
  getClientProductsByClient(clientId: number): Promise<ClientProduct[]>;
  updateClientProduct(id: number, data: Partial<ClientProduct>): Promise<ClientProduct | undefined>;
  
  // API Settings operations
  createApiSetting(setting: InsertApiSetting): Promise<ApiSetting>;
  getApiSettings(): Promise<ApiSetting[]>;
  getApiSettingsByMaster(masterCategory: string): Promise<ApiSetting[]>;
  getApiSetting(id: number): Promise<ApiSetting | undefined>;
  updateApiSetting(id: number, data: Partial<ApiSetting>): Promise<ApiSetting | undefined>;
  
  // User Products operations
  createUserProduct(userProduct: InsertUserProduct): Promise<UserProduct>;
  getUserProducts(): Promise<UserProduct[]>;
  getUserProductsByUser(userId: number): Promise<UserProduct[]>;
  getUserProduct(id: number): Promise<UserProduct | undefined>;
  updateUserProduct(id: number, data: Partial<UserProduct>): Promise<UserProduct | undefined>;
  deleteUserProduct(id: number): Promise<boolean>;
  
  // User Product Endpoints operations
  createUserProductEndpoint(endpoint: InsertUserProductEndpoint): Promise<UserProductEndpoint>;
  getUserProductEndpoints(userProductId: number): Promise<UserProductEndpoint[]>;
  getUserProductEndpoint(id: number): Promise<UserProductEndpoint | undefined>;
  updateUserProductEndpoint(id: number, data: Partial<UserProductEndpoint>): Promise<UserProductEndpoint | undefined>;
  deleteUserProductEndpoint(id: number): Promise<boolean>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  getRecentTransactions(limit: number): Promise<Transaction[]>;
  
  // Product Orders operations
  createProductOrder(order: InsertProductOrder): Promise<ProductOrder>;
  getProductOrders(): Promise<ProductOrder[]>;
  getProductOrdersByReseller(resellerId: number): Promise<ProductOrder[]>;
  getProductOrder(id: number): Promise<ProductOrder | undefined>;
  updateProductOrder(id: number, data: Partial<ProductOrder>): Promise<ProductOrder | undefined>;
  getPendingProductOrders(): Promise<ProductOrder[]>;
  getProductOrdersWithDetails(): Promise<any[]>; // Returns orders with product, client, and reseller details
  
  // Session store for authentication
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private productCategories: Map<number, ProductCategory>;
  private products: Map<number, Product>;
  private clients: Map<number, Client>;
  private clientProducts: Map<number, ClientProduct>;
  private apiSettings: Map<number, ApiSetting>;
  private userProducts: Map<number, UserProduct>;
  private userProductEndpoints: Map<number, UserProductEndpoint>;
  private transactions: Map<number, Transaction>;
  private productOrders: Map<number, ProductOrder>;

  // Session store
  sessionStore: session.Store;

  private userIdCounter: number;
  private productCategoryIdCounter: number;
  private productIdCounter: number;
  private clientIdCounter: number;
  private clientProductIdCounter: number;
  private apiSettingIdCounter: number;
  private userProductIdCounter: number;
  private userProductEndpointIdCounter: number;
  private transactionIdCounter: number;
  private productOrderIdCounter: number;

  constructor() {
    this.users = new Map();
    this.productCategories = new Map();
    this.products = new Map();
    this.clients = new Map();
    this.clientProducts = new Map();
    this.apiSettings = new Map();
    this.userProducts = new Map();
    this.userProductEndpoints = new Map();
    this.transactions = new Map();
    this.productOrders = new Map();

    this.userIdCounter = 1;
    this.productCategoryIdCounter = 1;
    this.productIdCounter = 1;
    this.clientIdCounter = 1;
    this.clientProductIdCounter = 1;
    this.apiSettingIdCounter = 1;
    this.userProductIdCounter = 1;
    this.userProductEndpointIdCounter = 1;
    this.transactionIdCounter = 1;
    this.productOrderIdCounter = 1;

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });

    // Create initial admin users with plain text passwords for development
    this.createUser({
      username: "admin",
      password: "admin123",
      role: "admin",
      creditBalance: "5000"
    });
    
    // Create CEO admin user
    this.createUser({
      username: "ceo@openweb.co.za",
      password: "Maniac20!",
      role: "admin",
      creditBalance: "10000"
    });
    
    // Create additional admin user
    this.createUser({
      username: "finance@openweb.co.za",
      password: "Finance2025!",
      role: "admin",
      creditBalance: "15000"
    });
    
    // Create reseller user example
    this.createUser({
      username: "reseller@example.com",
      password: "Reseller123!",
      role: "reseller",
      resellerGroup: 1,
      creditBalance: "2500"
    });

    // Create default product categories
    this.createProductCategory({
      name: "Fixed LTE",
      masterCategory: "MTN Fixed",
      description: "Fixed LTE products for homes and businesses"
    });

    this.createProductCategory({
      name: "GSM Data",
      masterCategory: "MTN GSM",
      description: "Mobile data SIM products"
    });

    // Create sample products
    this.createProduct({
      name: "MTN Fixed LTE 40GB Anytime",
      description: "40GB Anytime Data, No Night-time Bonus",
      basePrice: "299",
      group1Price: "289",
      group2Price: "279",
      categoryId: 1,
      status: "active",
      apiEndpoint: "/api/packages/fixed/40gb"
    });

    this.createProduct({
      name: "MTN Fixed LTE 60GB Anytime",
      description: "60GB Anytime Data, No Night-time Bonus",
      basePrice: "399",
      group1Price: "389",
      group2Price: "379",
      categoryId: 1,
      status: "active",
      apiEndpoint: "/api/packages/fixed/60gb"
    });

    // Create API settings
    this.createApiSetting({
      name: "Get Packages",
      endpoint: "/packages",
      masterCategory: "MTN Fixed",
      isEnabled: true
    });

    this.createApiSetting({
      name: "Get SIM Status",
      endpoint: "/sim/status",
      masterCategory: "MTN GSM",
      isEnabled: true
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      if (!insertUser) {
        throw new Error('Cannot create user: Invalid or empty user data provided');
      }
      
      if (!insertUser.username) {
        throw new Error('Cannot create user: Username is required');
      }
      
      if (!insertUser.password) {
        throw new Error('Cannot create user: Password is required');
      }
      
      // Ensure proper type conversion for required fields
      const normalizedData = {
        ...insertUser,
        role: insertUser.role || 'reseller',
        creditBalance: insertUser.creditBalance || '0',
        resellerGroup: typeof insertUser.resellerGroup === 'string' 
          ? parseInt(insertUser.resellerGroup, 10) 
          : (insertUser.resellerGroup || 1),
        paymentMode: insertUser.paymentMode || 'credit'
      };
      
      const id = this.userIdCounter++;
      const now = new Date();
      
      // Create user with properly typed fields
      const user: User = {
        id,
        username: normalizedData.username,
        password: normalizedData.password,
        role: normalizedData.role,
        creditBalance: normalizedData.creditBalance,
        resellerGroup: normalizedData.resellerGroup,
        paymentMode: normalizedData.paymentMode,
        dashboardConfig: null,
        createdAt: now
      };
      
      // Store in memory
      this.users.set(id, user);
      
      return user;
    } catch (error) {
      console.error(`Error in storage.createUser:`, error);
      throw new Error(`User creation failed in storage: ${(error as Error).message}`);
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserDashboard(id: number, dashboard: DashboardConfig): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    user.dashboardConfig = dashboard;
    this.users.set(id, user);
    return user;
  }

  // Product category operations
  async createProductCategory(category: InsertProductCategory): Promise<ProductCategory> {
    const id = this.productCategoryIdCounter++;
    const now = new Date();
    // Ensure we're handling nulls properly for optional fields
    const newCategory: ProductCategory = { 
      id, 
      name: category.name,
      masterCategory: category.masterCategory,
      createdAt: now,
      description: category.description ?? null,
      parentId: category.parentId ?? null,
      isActive: category.isActive ?? true
    };
    this.productCategories.set(id, newCategory);
    return newCategory;
  }

  async getProductCategories(): Promise<ProductCategory[]> {
    return Array.from(this.productCategories.values());
  }

  async getProductCategoriesByMaster(masterCategory: string): Promise<ProductCategory[]> {
    return Array.from(this.productCategories.values()).filter(
      (category) => category.masterCategory === masterCategory
    );
  }
  
  async updateProductCategory(id: number, data: Partial<ProductCategory>): Promise<ProductCategory | undefined> {
    const category = this.productCategories.get(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...data };
    this.productCategories.set(id, updatedCategory);
    return updatedCategory;
  }
  
  async deleteProductCategory(id: number): Promise<boolean> {
    return this.productCategories.delete(id);
  }

  // Product operations
  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.productIdCounter++;
    const now = new Date();
    
    // Generate a random 3-digit API identifier
    const generateApiIdentifier = (): string => {
      // Generate a number between 100 and 999
      return (Math.floor(Math.random() * 900) + 100).toString();
    };

    // Check if an API identifier already exists
    const isApiIdentifierUnique = (identifier: string): boolean => {
      for (const product of this.products.values()) {
        if (product.apiIdentifier === identifier) {
          return false;
        }
      }
      return true;
    };

    // Generate a unique API identifier with retry logic
    let apiIdentifier = generateApiIdentifier();
    let isUnique = isApiIdentifierUnique(apiIdentifier);
    let attempts = 1;
    const maxAttempts = 10; // Avoid infinite loop
    
    // If the generated identifier is not unique, try again
    while (!isUnique && attempts < maxAttempts) {
      apiIdentifier = generateApiIdentifier();
      isUnique = isApiIdentifierUnique(apiIdentifier);
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error('Failed to generate a unique API identifier after multiple attempts');
    }
    
    // Ensure we're handling nulls properly for the Product type
    const newProduct: Product = { 
      id, 
      name: product.name,
      createdAt: now,
      status: product.status ?? 'active',
      description: product.description ?? null,
      basePrice: product.basePrice,
      group1Price: product.group1Price,
      group2Price: product.group2Price,
      categoryId: product.categoryId,
      apiEndpoint: product.apiEndpoint ?? null,
      apiIdentifier: apiIdentifier
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.categoryId === categoryId
    );
  }

  async getProductsByMasterCategory(masterCategory: string): Promise<Product[]> {
    const categories = await this.getProductCategoriesByMaster(masterCategory);
    const categoryIds = categories.map(c => c.id);
    
    return Array.from(this.products.values()).filter(
      (product) => categoryIds.includes(product.categoryId)
    );
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined> {
    const product = await this.getProduct(id);
    if (!product) return undefined;
    
    const updatedProduct = { ...product, ...productData };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  // Client operations
  async createClient(client: InsertClient): Promise<Client> {
    const id = this.clientIdCounter++;
    const now = new Date();
    // Ensure we're handling nulls properly for the Client type
    const newClient: Client = { 
      id, 
      name: client.name,
      createdAt: now,
      email: client.email ?? null,
      phone: client.phone ?? null,
      resellerId: client.resellerId
    };
    this.clients.set(id, newClient);
    return newClient;
  }

  async getClientsByReseller(resellerId: number): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(
      (client) => client.resellerId === resellerId
    );
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  // Client product operations
  async createClientProduct(clientProduct: InsertClientProduct): Promise<ClientProduct> {
    const id = this.clientProductIdCounter++;
    const now = new Date();
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    
    // Ensure we're handling nulls properly for the ClientProduct type
    const newClientProduct: ClientProduct = { 
      id, 
      createdAt: now,
      status: clientProduct.status ?? 'pending',
      clientId: clientProduct.clientId,
      productId: clientProduct.productId,
      lastBilledDate: now,
      nextBillingDate
    };
    
    this.clientProducts.set(id, newClientProduct);
    return newClientProduct;
  }

  async getClientProductsByClient(clientId: number): Promise<ClientProduct[]> {
    return Array.from(this.clientProducts.values()).filter(
      (clientProduct) => clientProduct.clientId === clientId
    );
  }

  async updateClientProduct(id: number, data: Partial<ClientProduct>): Promise<ClientProduct | undefined> {
    const clientProduct = this.clientProducts.get(id);
    if (!clientProduct) return undefined;
    
    const updatedClientProduct = { ...clientProduct, ...data };
    this.clientProducts.set(id, updatedClientProduct);
    return updatedClientProduct;
  }

  // API Settings operations
  async createApiSetting(setting: InsertApiSetting): Promise<ApiSetting> {
    const id = this.apiSettingIdCounter++;
    const now = new Date();
    // Ensure we're handling nulls properly for the ApiSetting type
    const newSetting: ApiSetting = { 
      id, 
      name: setting.name,
      createdAt: now,
      masterCategory: setting.masterCategory,
      endpoint: setting.endpoint,
      isEnabled: setting.isEnabled ?? true
    };
    this.apiSettings.set(id, newSetting);
    return newSetting;
  }

  async getApiSettings(): Promise<ApiSetting[]> {
    return Array.from(this.apiSettings.values());
  }

  async getApiSettingsByMaster(masterCategory: string): Promise<ApiSetting[]> {
    return Array.from(this.apiSettings.values()).filter(
      (setting) => setting.masterCategory === masterCategory
    );
  }
  
  async getApiSetting(id: number): Promise<ApiSetting | undefined> {
    return this.apiSettings.get(id);
  }

  async updateApiSetting(id: number, data: Partial<ApiSetting>): Promise<ApiSetting | undefined> {
    const setting = this.apiSettings.get(id);
    if (!setting) return undefined;
    
    const updatedSetting = { ...setting, ...data };
    this.apiSettings.set(id, updatedSetting);
    return updatedSetting;
  }
  
  // User Products operations
  async createUserProduct(userProduct: InsertUserProduct): Promise<UserProduct> {
    const id = this.userProductIdCounter++;
    const now = new Date();
    
    const newUserProduct: UserProduct = {
      id,
      userId: userProduct.userId,
      productId: userProduct.productId,
      username: userProduct.username ?? null,
      msisdn: userProduct.msisdn ?? null,
      simNumber: userProduct.simNumber ?? null,
      comments: userProduct.comments ?? null,
      status: userProduct.status ?? 'active',
      createdAt: now
    };
    
    this.userProducts.set(id, newUserProduct);
    return newUserProduct;
  }
  
  async getUserProducts(): Promise<UserProduct[]> {
    return Array.from(this.userProducts.values());
  }
  
  async getUserProductsByUser(userId: number): Promise<UserProduct[]> {
    return Array.from(this.userProducts.values()).filter(
      (userProduct) => userProduct.userId === userId
    );
  }
  
  async getUserProduct(id: number): Promise<UserProduct | undefined> {
    return this.userProducts.get(id);
  }
  
  async updateUserProduct(id: number, data: Partial<UserProduct>): Promise<UserProduct | undefined> {
    const userProduct = this.userProducts.get(id);
    if (!userProduct) return undefined;
    
    const updatedUserProduct = { ...userProduct, ...data };
    this.userProducts.set(id, updatedUserProduct);
    return updatedUserProduct;
  }
  
  async deleteUserProduct(id: number): Promise<boolean> {
    return this.userProducts.delete(id);
  }
  
  // User Product Endpoints operations
  async createUserProductEndpoint(endpoint: InsertUserProductEndpoint): Promise<UserProductEndpoint> {
    const id = this.userProductEndpointIdCounter++;
    const now = new Date();
    
    const newEndpoint: UserProductEndpoint = {
      id,
      userProductId: endpoint.userProductId,
      apiSettingId: endpoint.apiSettingId,
      endpointPath: endpoint.endpointPath,
      customParameters: endpoint.customParameters ?? null,
      createdAt: now
    };
    
    this.userProductEndpoints.set(id, newEndpoint);
    return newEndpoint;
  }
  
  async getUserProductEndpoints(userProductId: number): Promise<UserProductEndpoint[]> {
    return Array.from(this.userProductEndpoints.values()).filter(
      (endpoint) => endpoint.userProductId === userProductId
    );
  }
  
  async getUserProductEndpoint(id: number): Promise<UserProductEndpoint | undefined> {
    return this.userProductEndpoints.get(id);
  }
  
  async updateUserProductEndpoint(id: number, data: Partial<UserProductEndpoint>): Promise<UserProductEndpoint | undefined> {
    const endpoint = this.userProductEndpoints.get(id);
    if (!endpoint) return undefined;
    
    const updatedEndpoint = { ...endpoint, ...data };
    this.userProductEndpoints.set(id, updatedEndpoint);
    return updatedEndpoint;
  }
  
  async deleteUserProductEndpoint(id: number): Promise<boolean> {
    return this.userProductEndpoints.delete(id);
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionIdCounter++;
    const now = new Date();
    
    // Ensure we're handling nulls properly for the Transaction type
    const newTransaction: Transaction = { 
      id,
      userId: transaction.userId,
      amount: transaction.amount,
      description: transaction.description,
      type: transaction.type,
      createdAt: now
    };
    
    this.transactions.set(id, newTransaction);
    
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
    
    return newTransaction;
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || new Date());
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || new Date());
        return dateB.getTime() - dateA.getTime(); // Sort by most recent first
      });
  }

  async getRecentTransactions(limit: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || new Date());
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || new Date());
        return dateB.getTime() - dateA.getTime(); // Sort by most recent first
      })
      .slice(0, limit);
  }
  
  // Product Orders operations
  async createProductOrder(order: InsertProductOrder): Promise<ProductOrder> {
    const id = this.productOrderIdCounter++;
    const now = new Date();
    
    const newOrder: ProductOrder = {
      id,
      resellerId: order.resellerId,
      clientId: order.clientId,
      productId: order.productId,
      status: order.status ?? 'pending',
      provisionMethod: order.provisionMethod,
      simNumber: order.simNumber ?? null,
      address: order.address ?? null,
      contactName: order.contactName ?? null,
      contactPhone: order.contactPhone ?? null,
      country: order.country ?? 'South Africa',
      rejectionReason: order.rejectionReason ?? null,
      createdAt: now
    };
    
    this.productOrders.set(id, newOrder);
    return newOrder;
  }
  
  async getProductOrders(): Promise<ProductOrder[]> {
    return Array.from(this.productOrders.values());
  }
  
  async getProductOrdersByReseller(resellerId: number): Promise<ProductOrder[]> {
    return Array.from(this.productOrders.values()).filter(
      (order) => order.resellerId === resellerId
    );
  }
  
  async getProductOrder(id: number): Promise<ProductOrder | undefined> {
    return this.productOrders.get(id);
  }
  
  async updateProductOrder(id: number, data: Partial<ProductOrder>): Promise<ProductOrder | undefined> {
    const order = this.productOrders.get(id);
    if (!order) return undefined;
    
    // If order status is changing to 'active', create a user product automatically
    if (data.status === 'active' && order.status !== 'active') {
      // Create a user product entry for the approved order
      await this.createUserProduct({
        userId: order.resellerId,
        productId: order.productId,
        status: 'active',
        // Transfer over SIM number if it exists
        simNumber: order.simNumber,
        comments: `Auto-created from order #${id}`
      });
    }
    
    const updatedOrder = { ...order, ...data };
    this.productOrders.set(id, updatedOrder);
    return updatedOrder;
  }
  
  async getPendingProductOrders(): Promise<ProductOrder[]> {
    return Array.from(this.productOrders.values()).filter(
      (order) => order.status === 'pending'
    );
  }
  
  async getProductOrdersWithDetails(): Promise<any[]> {
    const orders = await this.getProductOrders();
    const result = [];
    
    for (const order of orders) {
      const product = await this.getProduct(order.productId);
      const client = await this.getClient(order.clientId);
      const reseller = await this.getUser(order.resellerId);
      
      if (product && client && reseller) {
        result.push({
          ...order,
          product: {
            id: product.id,
            name: product.name,
            basePrice: product.basePrice
          },
          client: {
            id: client.id,
            name: client.name
          },
          reseller: {
            id: reseller.id,
            username: reseller.username
          }
        });
      }
    }
    
    return result;
  }
}

export const storage = new MemStorage();
