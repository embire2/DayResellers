/**
 * Test script to check if gale user can log in and access user products
 */
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000'; // Server runs on port 5000 as configured in server/index.ts

async function loginAsGale() {
  try {
    console.log('Attempting to login as gale...');
    
    // First try login
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'gale',
        password: 'gale123' // Assuming this is gale's password
      }),
      redirect: 'manual'
    });
    
    console.log('Login response:', {
      status: loginResponse.status,
      statusText: loginResponse.statusText,
      headers: [...loginResponse.headers]
    });
    
    if (loginResponse.status !== 200 && loginResponse.status !== 302) {
      console.error('Login failed with status:', loginResponse.status);
      const responseText = await loginResponse.text();
      console.error('Response text:', responseText);
      return;
    }
    
    // Get session cookie
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies received:', cookies);
    
    if (!cookies) {
      console.error('No cookies received after login');
      return;
    }
    
    // Parse and extract the session cookie
    const sessionCookie = cookies.split(';')[0];
    console.log('Session cookie:', sessionCookie);
    
    // Now try to access user products
    console.log('\nAttempting to fetch user products for user 3 (gale)...');
    
    const productsResponse = await fetch(`${BASE_URL}/api/user-products/3`, {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    console.log('Products response:', {
      status: productsResponse.status,
      statusText: productsResponse.statusText
    });
    
    if (productsResponse.status === 200) {
      const products = await productsResponse.json();
      console.log('User products retrieved:', products);
    } else {
      console.error('Failed to fetch user products');
      const responseText = await productsResponse.text();
      console.error('Response text:', responseText);
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

loginAsGale();