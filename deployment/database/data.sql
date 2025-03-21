--
-- PostgreSQL database sample data
--

-- Create initial admin user (password is hashed version of 'admin123')
INSERT INTO users (id, username, password, role, payment_mode, created_at)
VALUES (1, 'ceo@openweb.co.za', '$2b$10$5LMz/7VFcXqhylkYB4n2IOcN.UDlFY2JF5TGh3ICyxqTY.IWvfaYm', 'admin', 'credit', NOW());

-- Sample reseller user (password is hashed version of 'password123')
INSERT INTO users (id, username, password, role, payment_mode, reseller_group, created_at)
VALUES (2, 'john.reseller', '$2b$10$5LMz/7VFcXqhylkYB4n2IOcN.UDlFY2JF5TGh3ICyxqTY.IWvfaYm', 'reseller', 'credit', 1, NOW());

-- Sample reseller user (password is hashed version of 'password123')
INSERT INTO users (id, username, password, role, payment_mode, reseller_group, created_at)
VALUES (3, 'jenny', '$2b$10$5LMz/7VFcXqhylkYB4n2IOcN.UDlFY2JF5TGh3ICyxqTY.IWvfaYm', 'reseller', 'debit', 2, NOW());

-- Create product categories
INSERT INTO product_categories (id, name, master_category, description, parent_id, is_active, created_at)
VALUES (1, 'MTN Mobile', 'MTN Fixed', '', NULL, true, NOW());

INSERT INTO product_categories (id, name, master_category, description, parent_id, is_active, created_at)
VALUES (2, 'MTN Fixed Data SIMs', 'MTN Fixed', '', NULL, true, NOW());

-- Create sample products
INSERT INTO products (id, name, description, base_price, group1_price, group2_price, category_id, status, api_endpoint, api_identifier, created_at)
VALUES (1, '10Mbps Uncapped', 'Uncapped up to 10Mbps
FUP: 400GB then Shared Pool
Use your own 4G/5G router
Free Delivery
Plug and Play
Month to Month
Network selection is at OpenWeb''s discretion', '637.00', '574.00', '541.00', 1, 'active', '', '145', NOW());

INSERT INTO products (id, name, description, base_price, group1_price, group2_price, category_id, status, api_endpoint, api_identifier, created_at)
VALUES (2, '5Mbps Uncapped', 'Uncapped up to 5Mbps
FUP: 200GB then Shared Pool: (Users who use up their FUP data in a month get placed into a pool of other users who used up their FUP and can obtain speeds from 1Mbps to 10Mbps, depending on how busy the pool is)
Use your own 4G/5G router
Free Delivery
Plug and Play
Month to Month
Network selection is at OpenWeb''s discretion', '427.00', '384.00', '362.00', 1, 'active', '', '342', NOW());

-- Create API settings
INSERT INTO api_settings (id, name, endpoint, master_category, auth_type, username, password, created_at)
VALUES (1, 'Broadband.is API', 'https://www.broadband.is', 'MTN Fixed', 'basic', 'api@openweb.email', 'fsV4iYUx0M', NOW());

INSERT INTO api_settings (id, name, endpoint, master_category, auth_type, username, password, created_at)
VALUES (2, 'Broadband.is GSM API', 'https://www.broadband.is', 'MTN GSM', 'basic', 'api@openweb.email.gsm', 'fsV4iYUx0M', NOW());

-- Create sample clients for reseller
INSERT INTO clients (id, name, email, phone, address, reseller_id, created_at)
VALUES (1, 'Acme Corporation', 'contact@acme.com', '021 555 1234', '123 Main St, Cape Town', 2, NOW());

INSERT INTO clients (id, name, email, phone, address, reseller_id, created_at)
VALUES (2, 'XYZ Ltd', 'info@xyz.co.za', '011 888 5678', '456 Oak Ave, Johannesburg', 3, NOW());

-- Create sample user products
INSERT INTO user_products (id, user_id, product_id, status, username, sim_number, created_at)
VALUES (1, 3, 1, 'active', 'jenny_user1', '27812345678', NOW());

-- Create sample user product endpoints
INSERT INTO user_product_endpoints (id, user_product_id, api_setting_id, username, password, created_at)
VALUES (1, 1, 1, 'jenny_user1@domain', 'userpwd123', NOW());

-- Create sample transactions
INSERT INTO transactions (id, user_id, type, amount, description, created_at)
VALUES (1, 3, 'credit', 1000.00, 'Credit added by admin', NOW());

INSERT INTO transactions (id, user_id, type, amount, description, created_at)
VALUES (2, 3, 'debit', 500.00, 'Credit deducted by admin', NOW());

-- Reset sequence values
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('product_categories_id_seq', (SELECT MAX(id) FROM product_categories));
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));
SELECT setval('api_settings_id_seq', (SELECT MAX(id) FROM api_settings));
SELECT setval('clients_id_seq', (SELECT MAX(id) FROM clients));
SELECT setval('user_products_id_seq', (SELECT MAX(id) FROM user_products));
SELECT setval('user_product_endpoints_id_seq', (SELECT MAX(id) FROM user_product_endpoints));
SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions));