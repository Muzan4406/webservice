// PM2 configuration for Hostinger VPS / Node.js hosting
// Usage: pm2 start ecosystem.config.cjs
// Docs:  https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name: "muzan-service",
      script: "./artifacts/api-server/dist/index.cjs",
      interpreter: "node",
      interpreter_args: "--enable-source-maps",
      cwd: "/home/u<HOSTINGER_USER>/public_html", // ← change to your actual path
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        // Do NOT put secrets here — set them in the .env file or Hostinger panel
      },
      env_file: ".env", // load .env from project root
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
