import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';

import PrinterManager from './src/printer-manager';
import availableEndpoint from './src/endpoints/available';
import defaultEndpoint from './src/endpoints/default';
import writeEndpoint from './src/endpoints/write';
import readEndpoint from './src/endpoints/read';
import { HealthResponse } from './src/types';
import { requestLogger } from './src/middleware/request-logger';
import { errorHandler } from './src/middleware/error-handler';
import { loggers, setupGlobalExceptionLogging } from './src/logging/logger';
import healthEndpoint from './src/endpoints/health';

const app = express();

const PORT = Number(process.env.PORT || 9100);
const HOST = process.env.HOST || 'localhost';

setupGlobalExceptionLogging();

app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: '256kb' }));
app.use(bodyParser.text({ limit: '512kb', type: 'text/plain' }));
app.use(requestLogger());

const printerManager = new PrinterManager();

app.get('/available', availableEndpoint(printerManager));
app.get('/default', defaultEndpoint(printerManager));
app.post('/default', defaultEndpoint(printerManager));
app.delete('/default', defaultEndpoint(printerManager));
app.post('/write', writeEndpoint(printerManager));
app.post('/read', readEndpoint(printerManager));
app.get('/health', healthEndpoint());

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found', timestamp: new Date().toISOString() });
});

app.use(errorHandler());

app.listen(PORT, HOST, () => {
  loggers.main.info(`Elgin Printer Proxy listening on http://${HOST}:${PORT}`);
});

export default app;