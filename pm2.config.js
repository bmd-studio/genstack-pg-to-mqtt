const {
  SERVICE_NAME = 'pg-to-mqtt',
  PM2_WATCH_DELAY = 200,
  PM2_MAX_RESTARTS = 9999999,
  DEFAULT_DEBUG_PORT = 9229,
} = process.env;

module.exports = {
  apps: [       
    {
      name: SERVICE_NAME,
      script: 'src/index.ts',
      watch: true,
      watch_delay: PM2_WATCH_DELAY,
      max_restarts: PM2_MAX_RESTARTS,
      ignore_watch: ['node_modules'],
      watch_options: {
        usePolling: true,
      },              
      interpreter: 'node',
      interpreter_args: `--inspect=0.0.0.0:${DEFAULT_DEBUG_PORT} -r ts-node/register`,
      env: {
        DEBUG: 'pg-to-mqtt:*',
      },
    }
  ]
};