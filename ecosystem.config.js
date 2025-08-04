module.exports = {
  apps: [{
    name: 'mahboob-personal-assistant',
    script: 'npm',
    args: 'start',
    cwd: '/home/haherech/mahboob-personal-assistant',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}