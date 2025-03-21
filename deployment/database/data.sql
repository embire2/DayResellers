--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: api_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.api_settings (id, name, endpoint, master_category, is_enabled, created_at) VALUES (1, 'MTN Fixed API', 'https://api.broadband.is/v1/fixed', 'MTN Fixed', true, '2025-03-16 16:05:15.578538');
INSERT INTO public.api_settings (id, name, endpoint, master_category, is_enabled, created_at) VALUES (2, 'MTN GSM API', 'https://api.broadband.is/v1/gsm', 'MTN GSM', true, '2025-03-16 16:05:15.578538');


--
-- Data for Name: client_products; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.clients (id, name, email, phone, reseller_id, created_at) VALUES (1, 'Johnny Depp', 'johnny@depp.co.za', '0826987888', 3, '2025-03-17 14:56:59.809');


--
-- Data for Name: product_categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.product_categories (id, name, master_category, description, created_at, parent_id, is_active) VALUES (1, 'MTN Mobile', 'MTN Fixed', '', '2025-03-16 11:01:52.364', NULL, true);
INSERT INTO public.product_categories (id, name, master_category, description, created_at, parent_id, is_active) VALUES (2, 'MTN Fixed Data SIMs', 'MTN Fixed', '', '2025-03-16 12:11:11.555', NULL, true);


--
-- Data for Name: product_orders; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.product_orders (id, reseller_id, client_id, product_id, status, provision_method, sim_number, address, contact_name, contact_phone, country, rejection_reason, created_at) VALUES (1, 3, 1, 1, 'active', 'self', '71524155', NULL, NULL, NULL, 'South Africa', '', '2025-03-20 15:20:14.427911');


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.products (id, name, description, base_price, group1_price, group2_price, category_id, status, api_endpoint, created_at, api_identifier) VALUES (1, '2Mbps Uncapped', '2Mbps Uncapped', 397.00, 387.00, 342.00, 1, 'active', '', '2025-03-16 15:31:44.805', '145');
INSERT INTO public.products (id, name, description, base_price, group1_price, group2_price, category_id, status, api_endpoint, created_at, api_identifier) VALUES (2, '5Mbps Uncapped', 'Uncapped up to 5Mbps
FUP: 200GB then Shared Pool: (Users who use up their FUP data in a month get placed into a pool of other users who used up their FUP and can obtain speeds from 1Mbps to 10Mbps, depending on how busy the pool is)
Use your own 4G/5G router
Free Delivery
Plug and Play
Month to Month
Network selection is at OpenWeb''s discretion', 427.00, 384.00, 362.00, 1, 'active', '', '2025-03-21 11:14:41.558', '342');


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.sessions (sid, sess, expire) VALUES ('k1LhnKGFWYMB2hJsUQgsFttcj0csiODi', '{"cookie":{"originalMaxAge":86400000,"expires":"2025-03-21T15:31:44.587Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}', '2025-03-22 12:11:09');


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.transactions (id, user_id, amount, description, type, created_at) VALUES (1, 3, 100.00, 'Credit added by admin', 'credit', '2025-03-16 14:58:47.903');
INSERT INTO public.transactions (id, user_id, amount, description, type, created_at) VALUES (2, 3, 100.00, 'Credit deducted by admin', 'debit', '2025-03-16 14:58:54.675');


--
-- Data for Name: user_product_endpoints; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_products; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_products (id, user_id, product_id, username, msisdn, comments, status, created_at, sim_number) VALUES (1, 3, 1, 'gale.test', '0791234567', 'Test product for Gale', 'active', '2025-03-16 16:05:19.750774', NULL);
INSERT INTO public.user_products (id, user_id, product_id, username, msisdn, comments, status, created_at, sim_number) VALUES (2, 3, 1, '27605715663@mobile.is.co.za', '71524155', 'Auto-created from order #1', 'active', '2025-03-20 15:32:05.755483', NULL);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, username, password, role, credit_balance, reseller_group, dashboard_config, created_at, payment_mode) VALUES (1, 'ceo@openweb.co.za', '75f8fc985f882131bad7e8ebe0d904e3131805e56f39b6e04091a220c45221fa4ef8690a19150a3e5f82a4ba952291e511eaf692be1bd51be9e020bab0d44dea.76ef9943317d07a823f375cef4f66b78', 'admin', 1000.00, 1, NULL, '2025-03-16 09:05:12.317408', 'credit');
INSERT INTO public.users (id, username, password, role, credit_balance, reseller_group, dashboard_config, created_at, payment_mode) VALUES (2, 'ceo@day.co.za', '667e9966af91207bd7063a2ba3d135c1db45173a77e094968f19e3515635aede5bdbfd406be6c8e9e6aac22b62b932f3b7a3f4dc40a7eb9a26e0125d699c6109.0e024265655a1330ddeae5136a3a8600', 'admin', 1000.00, 1, NULL, '2025-03-16 09:17:45.552921', 'credit');
INSERT INTO public.users (id, username, password, role, credit_balance, reseller_group, dashboard_config, created_at, payment_mode) VALUES (4, 'royden', 'Royden123', 'reseller', 100.00, 1, NULL, '2025-03-16 15:38:38.994', 'credit');
INSERT INTO public.users (id, username, password, role, credit_balance, reseller_group, dashboard_config, created_at, payment_mode) VALUES (3, 'jenny', 'jenny123', 'reseller', 100.00, 1, '{"layouts": {"mobile": [{"x": 0, "y": 0, "id": "widget-1", "type": "stat-card", "title": "Statistic Card", "width": 1, "height": 1}, {"x": 0, "y": 0, "id": "widget-2", "type": "product-table", "title": "Products Table", "width": 3, "height": 2}, {"x": 0, "y": 0, "id": "widget-3", "type": "client-list", "title": "Client List", "width": 3, "height": 2}, {"x": 0, "y": 0, "id": "widget-4", "type": "activity-feed", "title": "Activity Feed", "width": 3, "height": 2}], "tablet": [{"x": 0, "y": 0, "id": "widget-1", "type": "stat-card", "title": "Statistic Card", "width": 1, "height": 1}, {"x": 0, "y": 0, "id": "widget-2", "type": "product-table", "title": "Products Table", "width": 3, "height": 2}, {"x": 0, "y": 0, "id": "widget-3", "type": "client-list", "title": "Client List", "width": 3, "height": 2}, {"x": 0, "y": 0, "id": "widget-4", "type": "activity-feed", "title": "Activity Feed", "width": 3, "height": 2}], "desktop": [{"x": 0, "y": 0, "id": "widget-1", "type": "stat-card", "title": "Statistic Card", "width": 1, "height": 1}, {"x": 0, "y": 0, "id": "widget-2", "type": "product-table", "title": "Products Table", "width": 3, "height": 2}, {"x": 0, "y": 0, "id": "widget-3", "type": "client-list", "title": "Client List", "width": 3, "height": 2}, {"x": 0, "y": 0, "id": "widget-4", "type": "activity-feed", "title": "Activity Feed", "width": 3, "height": 2}]}, "resellerId": 3}', '2025-03-16 13:43:23.289', 'debit');


--
-- Name: api_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.api_settings_id_seq', 2, true);


--
-- Name: client_products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.client_products_id_seq', 1, false);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clients_id_seq', 1, true);


--
-- Name: product_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.product_categories_id_seq', 2, true);


--
-- Name: product_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.product_orders_id_seq', 1, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 2, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transactions_id_seq', 2, true);


--
-- Name: user_product_endpoints_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_product_endpoints_id_seq', 1, false);


--
-- Name: user_products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_products_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- PostgreSQL database dump complete
--

