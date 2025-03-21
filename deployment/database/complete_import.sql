-- Create database
CREATE DATABASE day_reseller_platform;

-- Connect to the database
\c day_reseller_platform;

-- Import schema
\i schema.sql

-- Import data
\i data.sql