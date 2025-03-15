import axios from 'axios';
import { Express, Request, Response } from 'express';
import { storage } from './storage';
import { BroadbandApiResponse } from '@shared/types';

// Define API credentials
const MTN_FIXED_USERNAME = process.env.MTN_FIXED_USERNAME || 'api@openweb.email';
const MTN_GSM_USERNAME = process.env.MTN_GSM_USERNAME || 'api@openweb.email.gsm';
const API_PASSWORD = process.env.API_PASSWORD || 'fsV4iYUx0M';
const BROADBAND_API_BASE_URL = 'https://www-lab.broadband.is/~lte/api';

interface APICredentials {
  username: string;
  password: string;
}

// Get credentials based on category
const getCredentials = (masterCategory: string): APICredentials => {
  return {
    username: masterCategory === 'MTN GSM' ? MTN_GSM_USERNAME : MTN_FIXED_USERNAME,
    password: API_PASSWORD
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
};
