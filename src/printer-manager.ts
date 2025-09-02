import printerLib = require('@grandchef/node-printer');
import crypto from 'crypto';
import { loggers } from './logging/logger';
import { DiscoveredPrinter } from './types';
import { ConfigService } from './config/config-service';

export default class PrinterManager {
  private cache: DiscoveredPrinter[] = [];
  private lastRefresh = 0;
  private readonly refreshIntervalMs = 15_000;
  private truncBytes = Number(process.env.PRINT_LOG_TRUNCATE_BYTES || '512');
  private explicitDefault?: string;
  private configService?: ConfigService;

  setExplicitDefault(name: string) {
    this.explicitDefault = name;
    loggers.printing.info('ExplicitDefaultSet', { name });
  }

  getExplicitDefault() {
    return this.explicitDefault;
  }

  setConfigService(service: ConfigService) {
    this.configService = service;
  }

  private async refresh(force = false): Promise<void> {
    const now = Date.now();

    if (!force && this.cache.length > 0 && now - this.lastRefresh < this.refreshIntervalMs) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      try {
        const printers: printerLib.PrinterDetails[] = printerLib.getPrinters();

        this.cache = (printers || []).map(p => ({
          name: p.name,
          connection: p.options?.port?.toUpperCase().includes('USB') ? 'USB' : 'System',
          isDefault: p.isDefault,
          status: p.options?.status,
          uid: p.name,
          lastSeen: Date.now(),
        } as DiscoveredPrinter));

        loggers.printing.info('EnumeratedPrinters', {
          count: this.cache.length,
          names: this.cache.map(p => p.name),
        });

        this.lastRefresh = now;

        resolve();
      } catch (err: any) {
        loggers.printing.error('EnumerateFailed', { error: err.message });
        return reject(err);
      }
    });
  }

  async list(): Promise<DiscoveredPrinter[]> {
    await this.refresh();
    return this.cache;
  }

  async getDefaultPrinter(): Promise<DiscoveredPrinter | undefined> {
    const printers = await this.list();

    if (this.explicitDefault) {
      return printers.find(p => p.name === this.explicitDefault);
    }

    return printers.find(p => p.isDefault) || undefined;
  }

  async clearDefaultPrinter(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (this.configService) {
          this.configService.clearDefaultPrinter();
        }

        this.explicitDefault = undefined;

        await this.refresh(true);

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
        if (this.configService) {
          this.configService.setDefaultPrinter(name);
        }

        this.setExplicitDefault(name);

        await this.refresh(true);

        const printer = this.cache.find(p => p.name === name);

        if (!printer) {
          throw new Error(`Printer '${name}' not found`);
        }

        resolve(printer);
      } catch (err: any) {
        loggers.printing.error('SetDefaultRefreshFailed', { error: err.message });
        return reject(err);
      }
    })
  }

  private resolve(name?: string): string {
    if (name && name !== 'default') {
      const found = this.cache.find(p => p.name === name);

      if (!found) {
        throw new Error(`Printer '${name}' not found`);
      }

      return found.name;
    }

    if (this.explicitDefault) {
      const exists = this.cache.find(p => p.name === this.explicitDefault);

      if (exists) {
        return exists.name;
      }
    }

    const def = this.cache.find(p => p.isDefault) || this.cache[0];

    if (!def) {
      throw new Error('No printers available');
    }

    return def.name;
  }

  async sendRaw(printerName: string | undefined, data: string): Promise<string> {
    await this.refresh();

    const target = this.resolve(printerName);
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

    return new Promise<string>((resolve, reject) => {
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
    });
  }
}