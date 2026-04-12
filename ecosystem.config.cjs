module.exports = {
  apps: [
    {
      name: 'project-manager',
      script: 'npm',
      args: 'start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
