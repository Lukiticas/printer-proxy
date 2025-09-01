import printerLib = require('@grandchef/node-printer');
import {
  DiscoveredPrinter,
  BasicPrinterStatus,
  StoredDefaultPrinter
} from '../types';
import { DefaultPrinterStore } from './default-printer-store';
import pkg from '../package.json'

export default class PrinterManager {
  private cache: DiscoveredPrinter[] = [];
  private lastRefresh = 0;
  private readonly refreshIntervalMs = 15_000;
  private store: DefaultPrinterStore;

  constructor(store?: DefaultPrinterStore) {
    this.store = store || new DefaultPrinterStore();
  }

  private async refresh(force = false): Promise<void> {
    const now = Date.now();

    if (
      !force &&
      this.cache.length > 0 &&
      now - this.lastRefresh < this.refreshIntervalMs
    ) {
      return;
    }

    this.cache = await new Promise<DiscoveredPrinter[]>((resolve, reject) => {
      try {
        const printers: printerLib.PrinterDetails[] = printerLib.getPrinters();

        const mapped: DiscoveredPrinter[] = (printers || []).map((p) => ({
          name: p.name,
          connection: p.options?.port?.toUpperCase().includes('USB') ? 'USB' : 'System',
          isDefault: p.isDefault,
          status: p.options?.status ?? 'Unknown',
          uid: p.name,
          lastSeen: Date.now(),
          manufacturer: p.options?.manufacturer,
          origin: pkg.name,
        }));

        resolve(mapped);
      } catch (err) {
        reject(err);
      }
    });

    this.lastRefresh = now;
  }

  async list(): Promise<DiscoveredPrinter[]> {
    await this.refresh();
    return this.cache;
  }

  private isLabel(printer: DiscoveredPrinter): boolean {
    return /elgin|zebra|label|thermal/i.test(printer.name);
  }

  async getDefaultResolved(): Promise<DiscoveredPrinter | null> {
    await this.refresh();

    const loaded = this.store.load();
    const pinnedName = loaded.record?.name;
    let pinnedPrinter: DiscoveredPrinter | undefined;

    if (pinnedName) {
      pinnedPrinter = this.cache.find((p) => p.name === pinnedName);
    }

    if (pinnedPrinter) {
      return pinnedPrinter
    }

    const fallback =
      this.cache.find((p) => p.isDefault && this.isLabel(p)) ||
      this.cache.find((p) => this.isLabel(p)) ||
      null;

    return fallback;
  }

  async getDefault(): Promise<DiscoveredPrinter | null> {
    return await this.getDefaultResolved();
  }

  async setPinnedDefault(name: string, pinned = true): Promise<StoredDefaultPrinter> {
    await this.refresh();

    const target = this.cache.find((p) => p.name === name);

    if (!target) {
      throw new Error(`Printer '${name}' not found in current list`);
    }

    const record: StoredDefaultPrinter = {
      name: target.name,
      savedAt: new Date().toISOString(),
      pinned,
      meta: {
        lastSeenAtSave: target.lastSeen,
      },
    };

    this.store.save(record);

    return record;
  }

  clearPinnedDefault(): void {
    this.store.clear();
  }

  private resolve(name?: string): string {
    if (!name || name === 'default') {
      const loaded = this.store.load();

      if (loaded.record?.name) {
        const candidate = this.cache.find((p) => p.name === loaded.record!.name);

        if (candidate) {
          return candidate.name;
        }
      }

      const def = this.cache.find((p) => p.isDefault) || this.cache[0];

      if (!def) {
        throw new Error('No printers available');
      }

      return def.name;
    }

    const found = this.cache.find((p) => p.name === name);

    if (!found) {
      throw new Error(`Printer '${name}' not found`);
    }

    return found.name;
  }

  async sendRaw(printerName: string | undefined, data: string): Promise<string> {
    await this.refresh();

    const target = this.resolve(printerName);

    return new Promise<string>((resolve, reject) => {
      printerLib.printDirect({
        data,
        printer: target,
        type: 'RAW',
        success: (jobId) => resolve(String(jobId)),
        error: (err) => reject(err),
      });
    });
  }

  async queryStatus(printerName: string | undefined, command: string): Promise<BasicPrinterStatus> {
    await this.sendRaw(printerName, command);

    return {
      online: true,
      message: 'Command dispatched (no synchronous status from driver)',
      raw: undefined,
    };
  }
}