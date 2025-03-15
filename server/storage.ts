import { 
  users, type User, type InsertUser,
  productCategories, type ProductCategory, type InsertProductCategory,
  products, type Product, type InsertProduct,
  clients, type Client, type InsertClient,
  clientProducts, type ClientProduct, type InsertClientProduct,
  apiSettings, type ApiSetting, type InsertApiSetting,
  transactions, type Transaction, type InsertTransaction
} from "@shared/schema";
import { DashboardConfig } from "@shared/types";
import session from "express-session";
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
  updateApiSetting(id: number, data: Partial<ApiSetting>): Promise<ApiSetting | undefined>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  getRecentTransactions(limit: number): Promise<Transaction[]>;
  
  // Session store for authentication
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private productCategories: Map<number, ProductCategory>;
  private products: Map<number, Product>;
  private clients: Map<number, Client>;
  private clientProducts: Map<number, ClientProduct>;
  private apiSettings: Map<number, ApiSetting>;
  private transactions: Map<number, Transaction>;

  // Session store
  sessionStore: session.SessionStore;

  private userIdCounter: number;
  private productCategoryIdCounter: number;
  private productIdCounter: number;
  private clientIdCounter: number;
  private clientProductIdCounter: number;
  private apiSettingIdCounter: number;
  private transactionIdCounter: number;

  constructor() {
    this.users = new Map();
    this.productCategories = new Map();
    this.products = new Map();
    this.clients = new Map();
    this.clientProducts = new Map();
    this.apiSettings = new Map();
    this.transactions = new Map();

    this.userIdCounter = 1;
    this.productCategoryIdCounter = 1;
    this.productIdCounter = 1;
    this.clientIdCounter = 1;
    this.clientProductIdCounter = 1;
    this.apiSettingIdCounter = 1;
    this.transactionIdCounter = 1;

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });

    // Create initial admin users with plain text passwords for development
    this.createUser({
      username: "admin",
      password: "admin123",
      role: "admin"
    });
    
    // Create CEO admin user
    this.createUser({
      username: "ceo@openweb.co.za",
      password: "Maniac20!",
      role: "admin",
      creditBalance: "10000"
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
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { ...insertUser, id, createdAt: now, dashboardConfig: null };
    this.users.set(id, user);
    return user;
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
    const newCategory: ProductCategory = { ...category, id, createdAt: now };
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

  // Product operations
  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.productIdCounter++;
    const now = new Date();
    const newProduct: Product = { ...product, id, createdAt: now };
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
    const newClient: Client = { ...client, id, createdAt: now };
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
    
    const newClientProduct: ClientProduct = { 
      ...clientProduct, 
      id, 
      createdAt: now,
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
    const newSetting: ApiSetting = { ...setting, id, createdAt: now };
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

  async updateApiSetting(id: number, data: Partial<ApiSetting>): Promise<ApiSetting | undefined> {
    const setting = this.apiSettings.get(id);
    if (!setting) return undefined;
    
    const updatedSetting = { ...setting, ...data };
    this.apiSettings.set(id, updatedSetting);
    return updatedSetting;
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionIdCounter++;
    const now = new Date();
    const newTransaction: Transaction = { ...transaction, id, createdAt: now };
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
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime(); // Sort by most recent first
      });
  }

  async getRecentTransactions(limit: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime(); // Sort by most recent first
      })
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
