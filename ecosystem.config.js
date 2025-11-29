module.exports = {
  apps: [
    {
      name: 'svara-pro-server',
      script: './server/dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/server-err.log',
      out_file: './logs/server-out.log',
      log_file: './logs/server-combined.log',
      time: true
    },
    {
      name: 'svara-pro-bot',
      script: './bot/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        BOT_TOKEN: process.env.BOT_TOKEN,
        APP_URL: process.env.APP_URL
      },
      error_file: './logs/bot-err.log',
      out_file: './logs/bot-out.log',
      log_file: './logs/bot-combined.log',
      time: true
    },
    {
      name: 'svara-pro-service-bot',
      script: './service-bot/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        BOT_TOKEN: process.env.SERVICE_BOT_TOKEN,
        ADMIN_IDS: process.env.ADMIN_IDS,
        API_BASE_URL: process.env.API_BASE_URL,
        API_SECRET: process.env.API_SECRET
      },
      error_file: './logs/service-bot-err.log',
      out_file: './logs/service-bot-out.log',
      log_file: './logs/service-bot-combined.log',
      time: true
    }
  ]
};
