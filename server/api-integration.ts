import axios from 'axios';
import { Express, Request, Response } from 'express';
import { storage } from './storage';
import { BroadbandApiResponse } from '@shared/types';

// Define API credentials
const MTN_FIXED_USERNAME = process.env.MTN_FIXED_USERNAME || 'api@openweb.email';
const MTN_GSM_USERNAME = process.env.MTN_GSM_USERNAME || 'api@openweb.email.gsm';
const MTN_FIXED_PASSWORD = process.env.MTN_FIXED_PASSWORD || 'fsV4iYUx0M';
const MTN_GSM_PASSWORD = process.env.MTN_GSM_PASSWORD || 'fsV4iYUx0M';
const BROADBAND_API_BASE_URL = 'https://www.broadband.is/api';

interface APICredentials {
  username: string;
  password: string;
}

// Get credentials based on category
const getCredentials = (masterCategory: string): APICredentials => {
  return {
    username: masterCategory === 'MTN GSM' ? MTN_GSM_USERNAME : MTN_FIXED_USERNAME,
    password: masterCategory === 'MTN GSM' ? MTN_GSM_PASSWORD : MTN_FIXED_PASSWORD
  };
};

// Generic API request handler
const makeApiRequest = async (
  masterCategory: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  data?: any
): Promise<BroadbandApiResponse> => {
  try {
    const credentials = getCredentials(masterCategory);
    const url = `${BROADBAND_API_BASE_URL}${endpoint}`;

    const response = await axios({
      method,
      url,
      data,
      auth: {
        username: credentials.username,
        password: credentials.password
      }
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    let errorMessage = 'An error occurred while communicating with the Broadband.is API';
    
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || 
                     error.response?.statusText || 
                     error.message || 
                     errorMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

// Check if user is authorized for the API access
const checkApiAuthorization = async (req: Request, res: Response, masterCategory: string): Promise<boolean> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return false;
  }

  // Admin has access to all APIs
  if (req.user?.role === 'admin') {
    return true;
  }
  
  // For resellers, check if the endpoint is enabled in their configuration
  if (req.user?.role === 'reseller') {
    // This would be more complex in a real implementation, checking the user's permissions
    // For simplicity, we're allowing all resellers to access the endpoints
    return true;
  }

  res.status(403).json({ success: false, error: 'Not authorized to access this API' });
  return false;
};

export const setupApiIntegration = (app: Express) => {
  // Get all available endpoints
  app.get('/api/broadband/endpoints', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
      
      const apiSettings = await storage.getApiSettings();
      res.json({ success: true, data: apiSettings });
    } catch (error) {
      let errorMessage = 'Failed to fetch API endpoints';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Get endpoints for a specific master category
  app.get('/api/broadband/endpoints/:masterCategory', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
      
      const { masterCategory } = req.params;
      
      if (masterCategory !== 'MTN Fixed' && masterCategory !== 'MTN GSM') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid master category. Must be "MTN Fixed" or "MTN GSM"' 
        });
      }
      
      const apiSettings = await storage.getApiSettingsByMaster(masterCategory);
      res.json({ success: true, data: apiSettings });
    } catch (error) {
      let errorMessage = 'Failed to fetch API endpoints';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Create or update API setting
  app.post('/api/broadband/endpoints', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
      
      const { id, name, endpoint, masterCategory, isEnabled } = req.body;
      
      if (!name || !endpoint || !masterCategory) {
        return res.status(400).json({ 
          success: false, 
          error: 'Name, endpoint, and masterCategory are required' 
        });
      }
      
      if (masterCategory !== 'MTN Fixed' && masterCategory !== 'MTN GSM') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid master category. Must be "MTN Fixed" or "MTN GSM"' 
        });
      }
      
      let result;
      
      if (id) {
        // Update existing setting
        result = await storage.updateApiSetting(id, { name, endpoint, masterCategory, isEnabled });
        if (!result) {
          return res.status(404).json({ success: false, error: 'API setting not found' });
        }
      } else {
        // Create new setting
        result = await storage.createApiSetting({ name, endpoint, masterCategory, isEnabled });
      }
      
      res.json({ success: true, data: result });
    } catch (error) {
      let errorMessage = 'Failed to save API endpoint';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Generic GET endpoint for Broadband.is API
  app.get('/api/broadband/:masterCategory/:endpoint', async (req, res) => {
    try {
      const { masterCategory, endpoint } = req.params;
      
      if (masterCategory !== 'MTN Fixed' && masterCategory !== 'MTN GSM') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid master category. Must be "MTN Fixed" or "MTN GSM"' 
        });
      }
      
      if (!await checkApiAuthorization(req, res, masterCategory)) {
        return;
      }
      
      // Construct the real endpoint path from the database
      const apiSettings = await storage.getApiSettingsByMaster(masterCategory);
      const apiEndpoint = apiSettings.find(setting => 
        setting.endpoint.includes(endpoint) && setting.isEnabled
      );
      
      if (!apiEndpoint) {
        return res.status(404).json({ success: false, error: 'API endpoint not found or not enabled' });
      }
      
      const result = await makeApiRequest(masterCategory, apiEndpoint.endpoint, 'GET');
      res.json(result);
    } catch (error) {
      let errorMessage = 'Failed to execute API request';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Generic POST endpoint for Broadband.is API
  app.post('/api/broadband/:masterCategory/:endpoint', async (req, res) => {
    try {
      const { masterCategory, endpoint } = req.params;
      const data = req.body;
      
      if (masterCategory !== 'MTN Fixed' && masterCategory !== 'MTN GSM') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid master category. Must be "MTN Fixed" or "MTN GSM"' 
        });
      }
      
      if (!await checkApiAuthorization(req, res, masterCategory)) {
        return;
      }
      
      // Construct the real endpoint path from the database
      const apiSettings = await storage.getApiSettingsByMaster(masterCategory);
      const apiEndpoint = apiSettings.find(setting => 
        setting.endpoint.includes(endpoint) && setting.isEnabled
      );
      
      if (!apiEndpoint) {
        return res.status(404).json({ success: false, error: 'API endpoint not found or not enabled' });
      }
      
      const result = await makeApiRequest(masterCategory, apiEndpoint.endpoint, 'POST', data);
      res.json(result);
    } catch (error) {
      let errorMessage = 'Failed to execute API request';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Test connection to the Broadband.is API
  app.post('/api/broadband/test-connection', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
      
      const { masterCategory } = req.body;
      
      if (masterCategory !== 'MTN Fixed' && masterCategory !== 'MTN GSM') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid master category. Must be "MTN Fixed" or "MTN GSM"' 
        });
      }
      
      // Use a simple endpoint to test the connection
      const result = await makeApiRequest(masterCategory, '/test-connection', 'GET');
      res.json(result);
    } catch (error) {
      let errorMessage = 'Failed to test API connection';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Execute API test with specified parameters
  app.post('/api/broadband/execute-test', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
      
      const { masterCategory, endpoint, method, body } = req.body;
      
      if (!masterCategory || !endpoint) {
        return res.status(400).json({ 
          success: false, 
          error: 'Master category and endpoint are required' 
        });
      }
      
      if (masterCategory !== 'MTN Fixed' && masterCategory !== 'MTN GSM') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid master category. Must be "MTN Fixed" or "MTN GSM"' 
        });
      }
      
      if (method !== 'GET' && method !== 'POST') {
        return res.status(400).json({ 
          success: false, 
          error: 'Only GET and POST methods are supported' 
        });
      }
      
      // Execute the API request
      const result = await makeApiRequest(masterCategory, endpoint, method, body);
      res.json(result);
    } catch (error) {
      let errorMessage = 'Failed to execute API test';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(500).json({ success: false, error: errorMessage });
    }
  });
  
  // API Test Console endpoint
  app.post('/api/test-broadband-api', async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
      
      const { masterCategory, endpoint, params } = req.body;
      
      if (!masterCategory || !endpoint) {
        return res.status(400).json({ 
          success: false, 
          error: 'Master category and endpoint are required' 
        });
      }
      
      if (masterCategory !== 'MTN Fixed' && masterCategory !== 'MTN GSM') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid master category. Must be "MTN Fixed" or "MTN GSM"' 
        });
      }
      
      // Build the full endpoint path
      const fullEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      
      // Determine the method based on presence of params
      const method = Object.keys(params || {}).length > 0 ? 'POST' : 'GET';
      
      // Execute the API request
      const result = await makeApiRequest(masterCategory, fullEndpoint, method, params);
      res.json(result);
    } catch (error) {
      let errorMessage = 'Failed to execute API test';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Get monthly usage data for a user product
  app.get('/api/user-products/:id/usage/:month?', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      
      const userProductId = parseInt(req.params.id, 10);
      if (isNaN(userProductId)) {
        return res.status(400).json({ success: false, error: 'Invalid user product ID' });
      }
      
      // Get the user product
      const userProduct = await storage.getUserProduct(userProductId);
      if (!userProduct) {
        return res.status(404).json({ success: false, error: 'User product not found' });
      }
      
      // Check if user is authorized (either admin or owner of the product)
      if (req.user?.role !== 'admin' && req.user?.id !== userProduct.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized to access this user product' });
      }
      
      // Get the product to check the API identifier
      const product = await storage.getProduct(userProduct.productId);
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      
      // Check if the product has API identifier '145' for usage data
      if (product.apiIdentifier !== '145') {
        return res.status(400).json({ 
          success: false, 
          error: 'This product does not support usage data retrieval' 
        });
      }
      
      // Get the product category to determine the master category
      const categories = await storage.getProductCategories();
      const category = categories.find(cat => cat.id === product.categoryId);
      if (!category) {
        return res.status(404).json({ success: false, error: 'Product category not found' });
      }
      
      const masterCategory = category.masterCategory;
      if (masterCategory !== 'MTN Fixed' && masterCategory !== 'MTN GSM') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid master category. Must be "MTN Fixed" or "MTN GSM"' 
        });
      }
      
      // Get the month parameter or use the current month
      const date = new Date();
      const currentMonth = req.params.month ? req.params.month : 
        `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      // Parse the month (format YYYY-MM)
      const [year, month] = currentMonth.split('-');
      
      if (!year || !month || isNaN(parseInt(year)) || isNaN(parseInt(month))) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid month format. Use YYYY-MM' 
        });
      }
      
      // Build the endpoint path for monthly usage
      const endpoint = '/rest/lte/monthUsage.php';
      
      // Build the parameters
      const params = {
        year,
        month,
        usernames: userProduct.username
      };
      
      // Execute the API request
      const result = await makeApiRequest(masterCategory, endpoint, 'GET', params);
      
      // Convert usage data from bytes to GB if available
      if (result.success && result.data && Array.isArray(result.data.data)) {
        result.data.data.forEach((item: any) => {
          if (item.Total) {
            // Convert bytes to GB (1 GB = 1,073,741,824 bytes)
            const totalBytes = parseInt(item.Total);
            const totalGB = (totalBytes / 1073741824).toFixed(2);
            item.TotalGB = totalGB;
          }
        });
      }
      
      res.json(result);
    } catch (error) {
      let errorMessage = 'Failed to fetch usage data';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(500).json({ success: false, error: errorMessage });
    }
  });
};
