import printerLib = require('@grandchef/node-printer');
import crypto from 'crypto';
import { loggers } from '../logging/logger';
import { DiscoveredPrinter, NormalizedPrinterDetails } from '../types';
import { ConfigService } from '../config/config-service';
import pkg from '../../package.json';

interface PrinterManagerOptions {
  configService?: ConfigService;
  truncBytes?: number;
}

export default class PrinterManager {
  private truncBytes = Number(process.env.PRINT_LOG_TRUNCATE_BYTES || '512');
  private configService?: ConfigService;

  constructor(options?: PrinterManagerOptions) {
    this.configService = options?.configService;
    this.truncBytes = options?.truncBytes || this.truncBytes;
  }

  setConfigService(service: ConfigService) {
    this.configService = service;
  }

  private getConnectionString(printer: NormalizedPrinterDetails): string {
    const portName = printer.portName || ''

    if (portName.match(/^USB/i)) {
      return 'USB';
    }

    if (portName.match(/^(tcp|socket|ipp|http|https):\/\//i)) {
      return 'Network';
    }

    if (portName.match(/^lpt/i) || portName.match(/^com/i)) {
      return 'Driver';
    }

    if (portName.match(/^nul:$/i) || portName.match(/^PORTPROMPT:$/i)) {
      return 'System';
    }

    return 'Unknown';
  }

  async list(): Promise<DiscoveredPrinter[]> {
    return await new Promise<DiscoveredPrinter[]>((resolve, reject) => {
      try {
        const rawPrinters: NormalizedPrinterDetails[] = printerLib.getPrinters() as NormalizedPrinterDetails[];

        const printers = (rawPrinters || []).map(p => ({
          name: p.name,
          connection: p ? this.getConnectionString(p) : 'Unknown',
          isDefault: p.name === this.configService?.getDefaultPrinter() || p.isDefault || false,
          status: p.status[0] || 'Ready',
          uid: p.name,
          lastSeen: Date.now(),
          manufacturer: p.driverName || 'Unknown',
          provider: 'node-printer',
          deviceType: 'printer',
          version: p.datatype || 'Unknown',
          origin: pkg.name,
        } as DiscoveredPrinter));

        resolve(printers);
      } catch (err: any) {
        loggers.printing.error('EnumerateFailed', { error: err.message });
        return reject([]);
      }
    });
  }

  async getDefaultPrinter(): Promise<DiscoveredPrinter | undefined> {
    const printers = await this.list();
    return printers.find(p => p.isDefault) || undefined;
  }

  async clearDefaultPrinter(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.configService) {
          return reject('No config service available');
        }

        this.configService.clearDefaultPrinter();

        resolve()
      } catch (err: any) {
        loggers.printing.error('ClearDefaultFailed', { error: err.message });
        return reject(err);
      }
    })
  }

  async setDefaultPrinter(name: string): Promise<DiscoveredPrinter | undefined> {
    return new Promise<DiscoveredPrinter | undefined>(async (resolve, reject) => {
      try {
        if (!this.configService) {
          return reject('No config service available');
        }

        let resolvedName = await this.resolve(name);

        this.configService.setDefaultPrinter(resolvedName);

        const printer = (await this.list()).find(p => p.name === resolvedName);

        resolve(printer);
      } catch (err: any) {
        loggers.printing.error('SetDefaultRefreshFailed', { error: err.message });
        return reject(err);
      }
    })
  }

  async resolve(name?: string): Promise<string> {
    const printers = await this.list();

    if (printers.length === 0) {
      throw new Error('No printers available');
    }

    if ((!name || name === 'default') && this.configService?.getDefaultPrinter()) {
      const defaultPrinter = printers.find(p => p.name === this.configService?.getDefaultPrinter());

      if (defaultPrinter) {
        return defaultPrinter.name;
      }
    }

    if (name) {
      const found = printers.find(p => p.name === name);

      if (!found) {
        throw new Error(`Printer '${name}' not found`);
      }

      return found.name;
    }

    throw new Error('No printer specified and no default configured');
  }

  async sendRaw(printerName: string | undefined, data: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      try {
        const target = await this.resolve(printerName);

        const rawBuffer = Buffer.isBuffer(data)
          ? data
          : Buffer.from(data, 'utf8');

        const hash = crypto.createHash('md5')
          .update(rawBuffer)
          .digest('hex');

        const preview = rawBuffer.length > this.truncBytes
          ? rawBuffer.slice(0, this.truncBytes).toString('latin1') + '...[truncated]'
          : rawBuffer.toString('latin1');

        loggers.printing.info('PrintDispatch', {
          printer: target,
          bytes: rawBuffer.length,
          md5: hash,
          preview,
        });

        printerLib.printDirect({
          data: rawBuffer,
          printer: target,
          type: 'RAW',
          success: (jobId) => {
            loggers.printing.info('PrintSuccess', {
              printer: target,
              jobId: String(jobId),
              md5: hash,
            });

            resolve(String(jobId));
          },
          error: (err) => {
            loggers.printing.error('PrintError', {
              printer: target,
              error: err.message,
              md5: hash,
            });

            reject(err);
          },
        });
      } catch (err: any) {
        loggers.printing.error('PrintFailed', { error: err.message });
        return reject(err);
      }
    });
  }
}