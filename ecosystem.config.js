module.exports = {
  apps: [
    {
      name: 'project-manager',
      script: 'npm',
      args: 'start',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
      },
    },
  ],
}
