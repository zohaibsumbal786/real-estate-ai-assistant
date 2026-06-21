module.exports = {
  apps: [
    {
      name: "dubai-ai-api",
      cwd: __dirname,
      script: "npm",
      args: "run start --workspace @dubai-ai/api",
      env: {
        NODE_ENV: "production",
        PORT: 4000
      }
    },
    {
      name: "dubai-ai-web",
      cwd: __dirname,
      script: "npm",
      args: "run start --workspace @dubai-ai/web",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "dubai-ai-knowledge-worker",
      cwd: __dirname,
      script: "npm",
      args: "run start:worker:knowledge --workspace @dubai-ai/api",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "dubai-ai-reminder-worker",
      cwd: __dirname,
      script: "npm",
      args: "run start:worker:reminders --workspace @dubai-ai/api",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
