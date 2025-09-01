import fs from 'fs';
import path from 'path';
import { LoadedDefault, StoredDefaultPrinter } from './types';
import { loggers } from './logging/logger';

export class DefaultPrinterStore {
  private filePath: string;

  constructor(customPath?: string) {
    const resolved =
      customPath ||
      process.env.PRINTER_STORE_PATH ||
      path.join(process.cwd(), 'data', 'default-printer.json');

    this.filePath = resolved;
  }

  ensureDir(): void {
    try {
      const dir = path.dirname(this.filePath);

      if (fs.existsSync(dir)) {
        return
      }

      fs.mkdirSync(dir, { recursive: true });
    } catch (e: any) {
      loggers.printing.error('EnsurePrinterStoreDirFailed', { error: e.message });
    }
  }

  load(): LoadedDefault {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const record: StoredDefaultPrinter = JSON.parse(raw);

      if (!record.name) {
        return {
          record: null,
          stale: false,
          reason: 'Missing name'
        };
      }

      return {
        record,
        stale: false
      };
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        loggers.printing.warn('PrinterStoreNotFound', { error: e.message });

        return {
          record: null,
          stale: false,
          reason: 'No file'
        };
      }

      loggers.printing.error('PrinterStoreCorrupt', { error: e.message });

      return {
        record: null,
        stale: true,
        reason: 'Corrupt file'
      };
    }
  }

  save(record: StoredDefaultPrinter): void {
    try {
      this.ensureDir();

      const tmp = this.filePath + '.tmp';

      fs.writeFileSync(tmp, JSON.stringify(record, null, 2), 'utf8');
      fs.renameSync(tmp, this.filePath);

      fs.chmodSync(this.filePath, 0o600);
    } catch (err: any) {
      loggers.printing.error('SavePrinterStoreFailed', { error: err.message });
    }
  }

  clear(): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        loggers.printing.warn('ClearPrinterStoreNotFound', { path: this.filePath });
        return;
      }

      fs.unlinkSync(this.filePath);
    } catch (err: any) {
      loggers.printing.error('ClearPrinterStoreFailed', { error: err.message });
    }
  }
}