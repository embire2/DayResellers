# Day Reseller Platform - DirectAdmin Installation Guide

This guide provides detailed instructions for installing the Day Reseller Platform on a DirectAdmin server.

## Prerequisites

- DirectAdmin server with root access
- Node.js v18+ installed
- PostgreSQL 13+ installed
- PM2 for process management
- Nginx for reverse proxy

## Installation Steps

### 1. Database Setup

1. **Create PostgreSQL Database**:
   
   Login to your DirectAdmin PostgreSQL control panel:
   - Navigate to your DirectAdmin control panel
   - Click on "PostgreSQL Databases"
   - Create a new database named `day_reseller_platform`
   - Create a user with full permissions for this database

   Alternatively, use command line:
   ```bash
   su - postgres
   psql
   CREATE DATABASE day_reseller_platform;
   CREATE USER day_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE day_reseller_platform TO day_user;
   \q
   ```

2. **Import Database Schema and Data**:
   
   ```bash
   cd /path/to/deployment/database
   psql -U day_user -d day_reseller_platform -f schema.sql
   psql -U day_user -d day_reseller_platform -f data.sql
   ```

   Or use the combined script:
   ```bash
   psql -U postgres -f complete_import.sql
   ```

### 2. Application Setup

1. **Upload Application Files**:
   
   Upload all files from the `app` directory to your server, for example to `/var/www/day-reseller`:

   ```bash
   mkdir -p /var/www/day-reseller
   cp -r /path/to/deployment/app/* /var/www/day-reseller/
   cd /var/www/day-reseller
   ```

2. **Install Dependencies**:
   
   ```bash
   npm install --production
   ```

3. **Build the Application**:
   
   ```bash
   npm run build
   ```

4. **Configure Database Connection**:
   
   Edit `ecosystem.config.js` to update the database connection settings:
   
   ```javascript
   env: {
     DATABASE_URL: 'postgres://day_user:your_password@localhost:5432/day_reseller_platform'
   }
   ```

5. **Start the Application with PM2**:
   
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### 3. Web Server Configuration

1. **Configure Nginx**:
   
   Create a new Nginx site configuration:
   
   ```bash
   cp /path/to/deployment/app/nginx.conf /etc/nginx/sites-available/day-reseller
   ```

   Edit the file to update `your-domain.com` with your actual domain name.

2. **Enable the Site**:
   
   ```bash
   ln -s /etc/nginx/sites-available/day-reseller /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

3. **Alternatively, Using DirectAdmin**:
   
   - Go to DirectAdmin control panel
   - Navigate to "Custom httpd Configurations"
   - Add the Nginx configuration
   - Save and rebuild HTTP configuration

### 4. Setup SSL (Optional but Recommended)

1. **Using Certbot**:
   
   ```bash
   apt-get install certbot python3-certbot-nginx
   certbot --nginx -d your-domain.com
   ```

2. **Using DirectAdmin**:
   
   - Navigate to "SSL Certificates" in DirectAdmin
   - Select your domain
   - Choose "Let's Encrypt" or upload your own certificate
   - Follow the prompts to complete SSL setup

### 5. Testing the Installation

1. Visit your domain in a browser to verify the application is working.
2. Default admin login:
   - Username: `ceo@openweb.co.za`
   - Password: (Use the password from the original deployment)

## Troubleshooting

### Database Connection Issues

- Verify your PostgreSQL service is running: `systemctl status postgresql`
- Check connection parameters in `ecosystem.config.js`
- Ensure PostgreSQL is configured to allow connections from localhost

### Application Startup Problems

- Check PM2 logs: `pm2 logs day-reseller-platform`
- Verify Node.js version: `node -v` (should be v18+)
- Look for permission issues: `chown -R www-data:www-data /var/www/day-reseller`

### Nginx/Server Issues

- Check Nginx error logs: `tail -f /var/log/nginx/error.log`
- Verify Nginx configuration: `nginx -t`
- Ensure port 3000 is not being blocked by a firewall

## Maintenance

### Backup Procedure

1. **Database Backup**:
   
   ```bash
   pg_dump -U day_user day_reseller_platform > /path/to/backup/db_backup_$(date +"%Y%m%d").sql
   ```

2. **Application Backup**:
   
   ```bash
   cp -r /var/www/day-reseller /path/to/backup/app_backup_$(date +"%Y%m%d")
   ```

### Updating the Application

1. Stop the application:
   ```bash
   pm2 stop day-reseller-platform
   ```

2. Update files:
   ```bash
   # After uploading new files
   cd /var/www/day-reseller
   npm install --production
   npm run build
   ```

3. Restart the application:
   ```bash
   pm2 restart day-reseller-platform
   ```

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [DirectAdmin Documentation](https://www.directadmin.com/features.php?id=910)