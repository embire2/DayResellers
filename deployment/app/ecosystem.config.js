module.exports = {
  apps: [{
    name: 'day-reseller-platform',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgres://username:password@localhost:5432/day_reseller_platform'
    }
  }]
};