import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupApiIntegration } from "./api-integration";
import { calculateProRataPrice, getPriceByResellerGroup } from "../client/src/lib/utils";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Setup API integration routes
  setupApiIntegration(app);

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
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // No external API for user creation - users are managed locally on the server

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
      
      const result = await storage.deleteProductCategory(id);
      if (!result) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
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
      
      // For resellers, check credit balance
      if (req.user?.role === "reseller") {
        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(500).json({ message: "User not found" });
        }
        
        const userBalance = parseFloat(user.creditBalance?.toString() || "0");
        const productPrice = getPriceByResellerGroup(product, user.resellerGroup || 1);
        
        // Apply pro-rata pricing based on the current date
        const { finalPrice } = calculateProRataPrice(productPrice, new Date());
        
        if (userBalance < finalPrice) {
          return res.status(400).json({ 
            message: "Insufficient credit balance",
            required: finalPrice,
            available: userBalance
          });
        }
        
        // Deduct credit and create transaction
        await storage.createTransaction({
          userId: user.id,
          amount: finalPrice.toString(),
          description: `Purchase of ${product.name} for client ${client.name}`,
          type: "debit"
        });
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
        const transactionDate = new Date(transaction.createdAt);
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
            timestamp: transaction.createdAt
          };
        })
      );
      
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
