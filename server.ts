import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';

import PrinterManager from './src/printer-manager';
import availableEndpoint from './src/endpoints/available';
import defaultEndpoint from './src/endpoints/default';
import writeEndpoint from './src/endpoints/write';
import readEndpoint from './src/endpoints/read';
import { HealthResponse } from './types';

const app = express();
const PORT = 9100;
const HOST = 'localhost';

app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: '256kb' }));
app.use(bodyParser.text({ limit: '512kb', type: 'text/plain' }));

const printerManager = new PrinterManager();

// Routes
app.get('/available', availableEndpoint(printerManager));
app.get('/default', defaultEndpoint(printerManager));
app.post('/default', defaultEndpoint(printerManager));
app.delete('/default', defaultEndpoint(printerManager));
app.post('/write', writeEndpoint(printerManager));
app.post('/read', readEndpoint(printerManager));

app.get(
  '/health',
  (_req: Request, res: Response<HealthResponse>) => {
    res.json({
      status: 'running',
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
    });
  }
);

app.listen(PORT, HOST, () => {
  console.log(`Elgin Printer Proxy running at http://${HOST}:${PORT}`);
});

export default app;