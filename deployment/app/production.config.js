const path = require('path');

module.exports = {
  apps: [{
    name: 'day-reseller-platform',
    script: 'node server/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
  }]
};