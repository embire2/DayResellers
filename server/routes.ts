import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { pgStorage as storage } from "./pg-storage";
import { setupAuth } from "./auth";
import { setupApiIntegration } from "./api-integration";
import { calculateProRataPrice, getPriceByResellerGroup } from "../client/src/lib/utils";
import { setupDiagnosticRoutes, recordDiagnosticError } from "./diagnostic-routes";
import { logger } from "./logger";
import userProductsRouter from "./api/user-products";
import runEndpointRouter from "./api/run-endpoint";
import { eq } from "drizzle-orm";
import { setupScraperRoutes } from "./scraper";
import { initScraperService } from "./scraper/service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Setup API integration routes
  setupApiIntegration(app);
  
  // Setup diagnostic routes
  setupDiagnosticRoutes(app);
  
  // Setup web scraper routes
  setupScraperRoutes(app);
  
  // Initialize scraper service
  initScraperService(app);
  
  // API Settings routes
  app.get("/api/api-settings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const apiSettings = await storage.getApiSettings();
      res.json(apiSettings);
    } catch (error) {
      logger.error(`Failed to fetch API settings`, { 
        requestId: req.id,
        userId: req.user?.id 
      }, error as Error);
      
      res.status(500).json({ message: "Failed to fetch API settings" });
    }
  });

  // User Management Routes
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const users = await storage.getAllUsers();
      // Remove passwords from the response
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(safeUsers);
    } catch (error) {
      logger.error(`Failed to fetch users`, { 
        requestId: req.id,
        userId: req.user?.id 
      }, error as Error);
      
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Get a specific user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Allow admins to access any user, resellers only their own user data
      if (req.user?.role !== "admin" && req.user?.id !== parseInt(req.params.id)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Add logging to debug user retrieval
      logger.debug(`Fetching user with ID: ${userId}`, { userId });
      
      const user = await storage.getUser(userId);
      if (!user) {
        logger.warn(`User not found with ID: ${userId}`, { userId });
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      logger.error(`Failed to fetch user`, { 
        requestId: req.id,
        userId: req.user?.id,
        targetUserId: req.params.id
      }, error as Error);
      
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // User creation endpoint (admin only)
  app.post("/api/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        logger.warn(`Unauthorized user creation attempt`, { 
          requestId: req.id,
          userId: req.user?.id,
          role: req.user?.role
        });
        return res.status(403).json({ message: "Not authorized" });
      }
      
      logger.info(`Admin attempting to create user`, { 
        requestId: req.id,
        userId: req.user.id,
        newUsername: req.body.username,
        newRole: req.body.role
      });
      
      // Basic validation
      if (!req.body.username || !req.body.password) {
        logger.warn(`User creation failed: Missing required fields`, {
          requestId: req.id,
          userId: req.user.id,
          providedFields: Object.keys(req.body).filter(k => k !== 'password')
        });
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        logger.warn(`User creation failed: Username already exists`, {
          requestId: req.id,
          userId: req.user.id,
          username: req.body.username
        });
        return res.status(400).json({ message: "Username already exists" });
      }
      
      try {
        // Create the user with detailed logging
        const userData = {
          ...req.body,
          role: req.body.role || 'reseller',
          creditBalance: req.body.creditBalance || '0',
          resellerGroup: typeof req.body.resellerGroup === 'string' 
            ? parseInt(req.body.resellerGroup, 10) 
            : (req.body.resellerGroup || 1)
        };
        
        logger.debug(`Creating user with normalized data`, {
          requestId: req.id,
          userId: req.user.id,
          userData: {
            ...userData,
            password: '[REDACTED]'
          }
        });
        
        const user = await storage.createUser(userData);
        
        logger.info(`User created successfully by admin`, {
          requestId: req.id,
          adminId: req.user.id,
          newUserId: user.id,
          newUsername: user.username,
          newRole: user.role
        });
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      } catch (createError) {
        logger.error(`Error during user creation by admin`, {
          requestId: req.id,
          userId: req.user.id,
          error: (createError as Error).message
        }, createError as Error);
        
        // Record for diagnostics
        recordDiagnosticError(req, createError, req.body);
        
        return res.status(500).json({ 
          message: "Failed to create user", 
          error: (createError as Error).message,
          requestId: req.id
        });
      }
    } catch (error) {
      logger.error(`Unexpected error in user creation endpoint`, {
        requestId: req.id,
        userId: req.user?.id
      }, error as Error);
      
      // Record for diagnostics
      recordDiagnosticError(req, error, req.body);
      
      res.status(500).json({ 
        message: "An unexpected error occurred", 
        error: (error as Error).message,
        requestId: req.id
      });
    }
  });

  // Update user
  app.put("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }

      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // If updating username, check if the new username already exists (unless it's the same user)
      if (req.body.username && req.body.username !== existingUser.username) {
        const userWithSameUsername = await storage.getUserByUsername(req.body.username);
        if (userWithSameUsername && userWithSameUsername.id !== userId) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      // Update the user
      logger.info(`Admin updating user with ID: ${userId}`, {
        requestId: req.id,
        adminId: req.user.id,
        userId: userId,
        updates: { ...req.body, password: req.body.password ? "[REDACTED]" : undefined }
      });

      const updatedUser = await storage.updateUser(userId, req.body);
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      logger.error(`Failed to update user`, {
        requestId: req.id,
        userId: req.user?.id,
        targetUserId: req.params.id
      }, error as Error);
      
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Update user credit balance
  app.post("/api/users/:id/credit", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const userId = parseInt(req.params.id);
      const { amount, type } = req.body;
      
      if (!amount || !type || (type !== "add" && type !== "subtract")) {
        return res.status(400).json({ message: "Invalid request parameters" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const currentBalance = parseFloat(user.creditBalance?.toString() || "0");
      const amountValue = parseFloat(amount);
      
      let newBalance = currentBalance;
      if (type === "add") {
        newBalance = currentBalance + amountValue;
      } else {
        newBalance = currentBalance - amountValue;
      }
      
      let transactionType = type === "add" ? "credit" : "debit";
      let transactionAmount = amountValue;
      let description = type === "add" ? "Credit added by admin" : "Credit deducted by admin";
      
      // Create transaction record
      await storage.createTransaction({
        userId,
        amount: transactionAmount.toString(),
        description,
        type: transactionType
      });
      
      // Update user balance
      const updatedUser = await storage.updateUser(userId, {
        creditBalance: newBalance.toString()
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update credit balance" });
    }
  });

  // Product Category Routes
  app.get("/api/product-categories", async (req, res) => {
    try {
      const categories = await storage.getProductCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product categories" });
    }
  });

  app.get("/api/product-categories/:masterCategory", async (req, res) => {
    try {
      const { masterCategory } = req.params;
      const categories = await storage.getProductCategoriesByMaster(masterCategory);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product categories" });
    }
  });

  app.post("/api/product-categories", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const category = await storage.createProductCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to create product category" });
    }
  });
  
  app.patch("/api/product-categories/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const updatedCategory = await storage.updateProductCategory(id, req.body);
      if (!updatedCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(updatedCategory);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product category" });
    }
  });
  
  app.delete("/api/product-categories/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      // Check if any products are using this category
      const productsInCategory = await storage.getProductsByCategory(id);
      if (productsInCategory.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete category with products. Please move or delete the products first." 
        });
      }
      
      // Check if there are subcategories that use this category as a parent
      const allCategories = await storage.getProductCategories();
      const hasSubcategories = allCategories.some(cat => cat.parentId === id);
      if (hasSubcategories) {
        return res.status(400).json({ 
          message: "Cannot delete category with subcategories. Please delete or reassign subcategories first." 
        });
      }
      
      const result = await storage.deleteProductCategory(id);
      if (!result) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      logger.error(`Failed to delete product category`, { 
        requestId: req.id,
        userId: req.user?.id,
        categoryId: req.params.id
      }, error as Error);
      
      res.status(500).json({ message: "Failed to delete product category" });
    }
  });

  // Product Routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:masterCategory", async (req, res) => {
    try {
      const { masterCategory } = req.params;
      const products = await storage.getProductsByMasterCategory(masterCategory);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const product = await storage.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const productId = parseInt(req.params.id);
      const updatedProduct = await storage.updateProduct(productId, req.body);
      
      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(updatedProduct);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const productId = parseInt(req.params.id);
      const result = await storage.deleteProduct(productId);
      
      if (!result) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Client Routes
  app.get("/api/clients", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      let clients;
      
      if (req.user?.role === "admin") {
        // Admin can see all clients
        clients = await storage.getClientsByReseller(0); // Implement this method
      } else {
        // Resellers can only see their clients
        clients = await storage.getClientsByReseller(req.user?.id);
      }
      
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // For resellers, force the resellerId to be their user ID
      if (req.user?.role === "reseller") {
        req.body.resellerId = req.user.id;
      }
      
      const client = await storage.createClient(req.body);
      res.status(201).json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Client Product Routes
  app.get("/api/clients/:id/products", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Ensure users can only access their own clients (except admins)
      if (req.user?.role !== "admin" && client.resellerId !== req.user?.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const clientProducts = await storage.getClientProductsByClient(clientId);
      
      // Enrich with product details
      const enrichedProducts = await Promise.all(
        clientProducts.map(async (cp) => {
          const product = await storage.getProduct(cp.productId);
          return {
            ...cp,
            product
          };
        })
      );
      
      res.json(enrichedProducts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client products" });
    }
  });

  app.post("/api/clients/:id/products", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Ensure users can only access their own clients (except admins)
      if (req.user?.role !== "admin" && client.resellerId !== req.user?.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const { productId } = req.body;
      
      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // For resellers, handle based on payment mode
      if (req.user?.role === "reseller") {
        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(500).json({ message: "User not found" });
        }
        
        const productPrice = getPriceByResellerGroup(product, user.resellerGroup || 1);
        
        // Apply pro-rata pricing based on the current date
        const { finalPrice } = calculateProRataPrice(productPrice, new Date());
        
        // Check credit balance only for users with credit payment mode
        if (user.paymentMode === 'credit') {
          const userBalance = parseFloat(user.creditBalance?.toString() || "0");
          
          if (userBalance < finalPrice) {
            return res.status(400).json({ 
              message: "Insufficient credit balance",
              required: finalPrice,
              available: userBalance
            });
          }
          
          // Deduct credit and create transaction for credit users
          await storage.createTransaction({
            userId: user.id,
            amount: finalPrice.toString(),
            description: `Purchase of ${product.name} for client ${client.name}`,
            type: "debit"
          });
        }
        // For debit order users, we just record the transaction without checking balance
        else if (user.paymentMode === 'debit') {
          // Record the transaction for accounting purposes
          await storage.createTransaction({
            userId: user.id,
            amount: finalPrice.toString(),
            description: `Debit order - ${product.name} for client ${client.name}`,
            type: "debit"
          });
          
          logger.info(`Debit order product purchase`, {
            userId: user.id,
            username: user.username,
            productId: product.id,
            productName: product.name,
            clientId: client.id,
            clientName: client.name,
            amount: finalPrice
          });
        }
      }
      
      const clientProduct = await storage.createClientProduct({
        clientId,
        productId,
        status: "active"
      });
      
      res.status(201).json(clientProduct);
    } catch (error) {
      res.status(500).json({ message: "Failed to create client product" });
    }
  });

  // Dashboard Designer Routes
  app.get("/api/dashboards/:resellerId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const resellerId = parseInt(req.params.resellerId);
      const user = await storage.getUser(resellerId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.role !== "reseller") {
        return res.status(400).json({ message: "User is not a reseller" });
      }
      
      res.json(user.dashboardConfig || { layouts: { desktop: [], tablet: [], mobile: [] } });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard configuration" });
    }
  });

  app.post("/api/dashboards/:resellerId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const resellerId = parseInt(req.params.resellerId);
      const { widgets } = req.body;
      
      if (!widgets) {
        return res.status(400).json({ message: "Widgets array is required" });
      }
      
      const user = await storage.getUser(resellerId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.role !== "reseller") {
        return res.status(400).json({ message: "User is not a reseller" });
      }
      
      const dashboardConfig = {
        layouts: {
          desktop: widgets,
          tablet: widgets,
          mobile: widgets
        },
        resellerId
      };
      
      const updatedUser = await storage.updateUserDashboard(resellerId, dashboardConfig);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update dashboard configuration" });
      }
      
      res.json(updatedUser.dashboardConfig);
    } catch (error) {
      res.status(500).json({ message: "Failed to update dashboard configuration" });
    }
  });

  // Admin Stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const users = await storage.getAllUsers();
      const resellers = users.filter(user => user.role === "reseller");
      
      // Calculate total revenue (simplified approach for demo)
      let monthlyRevenue = 0;
      const transactions = await storage.getRecentTransactions(100);
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      transactions.forEach(transaction => {
        // Safely handle the transaction date, ensuring it's a valid Date object
        const transactionDate = new Date(transaction.createdAt || new Date());
        if (
          transactionDate.getMonth() === currentMonth && 
          transactionDate.getFullYear() === currentYear &&
          transaction.type === "debit"
        ) {
          monthlyRevenue += parseFloat(transaction.amount.toString());
        }
      });
      
      // Count active SIMs (simplified)
      const products = await storage.getProducts();
      const activeSims = products.filter(product => product.status === "active").length;
      
      res.json({
        totalResellers: resellers.length,
        monthlyRevenue: `R ${monthlyRevenue.toFixed(2)}`,
        activeSims
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Recent Activities
  app.get("/api/admin/activities", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Get recent transactions and format them as activities
      const transactions = await storage.getRecentTransactions(10);
      
      const activities = await Promise.all(
        transactions.map(async (transaction, index) => {
          const user = await storage.getUser(transaction.userId);
          
          let action = transaction.description;
          
          return {
            id: index + 1, // Simple ID for the frontend
            username: user?.username || "Unknown User",
            action,
            timestamp: transaction.createdAt || new Date()
          };
        })
      );
      
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Register the User Products router
  // Add detailed request logging middleware for user products endpoint
  app.use('/api/user-products', (req, res, next) => {
    logger.warn(`[USER-PRODUCTS DEBUG] Request received:`, {
      path: req.originalUrl,
      method: req.method,
      params: req.params,
      query: req.query,
      authenticatedUser: req.isAuthenticated() ? { 
        id: req.user?.id, 
        username: req.user?.username,
        role: req.user?.role 
      } : 'Not authenticated',
      requestId: req.id
    });
    next();
  }, userProductsRouter);
  app.use('/api/run-endpoint', runEndpointRouter);

  // Product Order Routes
  app.get('/api/orders', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = req.user as any;
      let orders;

      if (user.role === 'admin') {
        orders = await storage.getProductOrdersWithDetails();
      } else {
        orders = await storage.getProductOrdersByReseller(user.id);
      }

      return res.json(orders);
    } catch (error) {
      recordDiagnosticError(req, error);
      logger.error("Error fetching product orders", { userId: (req.user as any)?.id }, error as Error);
      return res.status(500).json({ message: "Failed to fetch product orders" });
    }
  });

  app.get('/api/orders/reseller/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const resellerId = parseInt(req.params.id);
      if (isNaN(resellerId)) {
        return res.status(400).json({ message: "Invalid reseller ID" });
      }

      const user = req.user as any;
      // Only allow admins or the reseller themselves to view their orders
      if (user.role !== 'admin' && user.id !== resellerId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const orders = await storage.getProductOrdersByReseller(resellerId);
      return res.json(orders);
    } catch (error) {
      recordDiagnosticError(req, error);
      logger.error("Error fetching reseller orders", { userId: (req.user as any)?.id, resellerId: req.params.id }, error as Error);
      return res.status(500).json({ message: "Failed to fetch reseller orders" });
    }
  });

  app.get('/api/orders/pending', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = req.user as any;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized" });
      }

      const pendingOrders = await storage.getPendingProductOrders();
      return res.json(pendingOrders);
    } catch (error) {
      recordDiagnosticError(req, error);
      logger.error("Error fetching pending orders", { userId: (req.user as any)?.id }, error as Error);
      return res.status(500).json({ message: "Failed to fetch pending orders" });
    }
  });

  app.get('/api/orders/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }

      const order = await storage.getProductOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const user = req.user as any;
      // Only admin or the order owner can view the order
      if (user.role !== 'admin' && order.resellerId !== user.id) {
        return res.status(403).json({ message: "Not authorized to view this order" });
      }

      return res.json(order);
    } catch (error) {
      recordDiagnosticError(req, error);
      logger.error("Error fetching order", { 
        userId: (req.user as any)?.id, 
        orderId: req.params.id 
      }, error as Error);
      return res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = req.user as any;
      
      // Add the reseller ID from the authenticated user
      const orderData = {
        ...req.body,
        resellerId: user.id,
        status: 'pending' // All new orders start as pending
      };

      // Validate required fields
      if (!orderData.productId || !orderData.clientId || !orderData.provisionMethod) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate provision method specific fields
      if (orderData.provisionMethod === 'courier' && 
          (!orderData.address || !orderData.contactName || !orderData.contactPhone)) {
        return res.status(400).json({ 
          message: "Courier provision method requires address, contact name, and contact phone" 
        });
      }

      if (orderData.provisionMethod === 'self' && !orderData.simNumber) {
        return res.status(400).json({ 
          message: "Self provision method requires SIM serial number" 
        });
      }

      // Create the order
      const newOrder = await storage.createProductOrder(orderData);
      return res.status(201).json(newOrder);
    } catch (error) {
      recordDiagnosticError(req, error, req.body);
      logger.error("Error creating product order", { 
        userId: (req.user as any)?.id, 
        orderData: req.body 
      }, error as Error);
      return res.status(500).json({ message: "Failed to create product order" });
    }
  });

  app.patch('/api/orders/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }

      const order = await storage.getProductOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const user = req.user as any;
      
      // Only admin can update order status
      if (req.body.status && user.role !== 'admin') {
        return res.status(403).json({ message: "Only admin can update order status" });
      }

      // For rejection, require a reason
      if (req.body.status === 'rejected' && !req.body.rejectionReason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      // Update the order
      const updatedOrder = await storage.updateProductOrder(orderId, req.body);
      return res.json(updatedOrder);
    } catch (error) {
      recordDiagnosticError(req, error, req.body);
      logger.error("Error updating product order", { 
        userId: (req.user as any)?.id, 
        orderId: req.params.id,
        updateData: req.body
      }, error as Error);
      return res.status(500).json({ message: "Failed to update product order" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
