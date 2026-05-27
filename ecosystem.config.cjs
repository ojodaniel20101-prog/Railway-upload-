/**
 * PM2 Ecosystem Configuration for UNKNOWN IS NO MORE Bot Platform
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 stop unknown-zx1
 *   pm2 restart unknown-zx1
 *   pm2 delete unknown-zx1
 */

module.exports = {
  apps: [
    {
      name: 'unknown-zx1',
      script: 'src/index.js',
      instances: 'max',          // Use all available CPU cores
      exec_mode: 'cluster',      // Enable cluster mode
      watch: false,              // Disable file watching in production
      max_memory_restart: '512M', // Restart if memory exceeds 512MB
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
