require('dotenv').config({ debug: true, path: '.env' });

import { startServer } from './src/runtime/server-core';

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});