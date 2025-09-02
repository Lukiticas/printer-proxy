require('dotenv').config({ debug: true, path: '.env' });

console.log('[server top] LOG_LEVEL at import time:', process.env.LOG_LEVEL);

import { startServer } from './src/runtime/server-core';

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});