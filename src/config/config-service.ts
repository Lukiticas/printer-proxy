import fs from 'fs';
import path from 'path';
import {
  defaultSettings,
  validateSettings,
  applyPartial,
  CURRENT_SCHEMA_VERSION
} from './schema';
import { loggers } from '../logging/logger';
import { PartialSettingsInput, SettingsData } from '../types/schema';
import { resolveSettingsPath } from '../runtime/paths';

export class ConfigService {
  private filePath: string;
  private settings: SettingsData;

  constructor() {
    this.filePath = resolveSettingsPath('settings.json');
    this.settings = defaultSettings();
  }

  async init() {
    this.ensureDir();

    if (fs.existsSync(this.filePath)) {
      this.load();
      return
    }

    this.bootstrapFromEnv();
    this.save();

    loggers.main.info('ConfigCreatedFromEnv', { file: this.filePath });
  }

  private ensureDir() {
    const dir = path.dirname(this.filePath);

    if (fs.existsSync(dir)) {
      return;
    }

    fs.mkdirSync(dir, { recursive: true });
  }

  private load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(raw);
      const v = validateSettings(data);

      if (!v.valid || !v.value) {
        throw new Error(v.errors.join('; '));
      }

      this.settings = v.value;

      if (this.settings.security.trustLoopback === undefined) {
        this.settings.security.trustLoopback = true;
      }

      if (this.settings.security.includePortInHostKey === undefined) {
        this.settings.security.includePortInHostKey = false;
      }

      this.save();

      loggers.main.info('ConfigLoaded', {
        host: this.settings.host,
        port: this.settings.port,
        defaultPrinter: this.settings.defaultPrinter
      });
    } catch (e: any) {
      loggers.errors.error('ConfigLoadFailed', { error: e.message });

      this.settings = defaultSettings();
      this.save();
    }
  }

  private bootstrapFromEnv() {
    const s = defaultSettings();

    if (process.env.HOST) {
      s.host = process.env.HOST;
    }

    if (process.env.PORT && !Number.isNaN(Number(process.env.PORT))) {
      s.port = Number(process.env.PORT);
    }

    s.defaultPrinter = process.env.DEFAULT_PRINTER || undefined

    this.settings = s;
  }

  reloadFromEnv(): { changedKeys: string[] } {
    const patch: PartialSettingsInput = {};

    if (process.env.HOST) {
      patch.host = process.env.HOST;
    }

    if (process.env.PORT && !Number.isNaN(Number(process.env.PORT))) {
      patch.port = Number(process.env.PORT);
    }

    patch.defaultPrinter = process.env.DEFAULT_PRINTER;

    const { updated, changedKeys } = applyPartial(this.settings, patch);

    this.settings = updated;
    this.save();

    loggers.main.info('ConfigReloadFromEnv', { changedKeys });

    return { changedKeys };
  }

  get(): SettingsData {
    return this.settings;
  }

  update(patch: PartialSettingsInput) {
    const { updated, changedKeys, restartRequired } = applyPartial(this.settings, patch);

    this.settings = updated;
    this.save();

    loggers.main.info('ConfigUpdated', { changedKeys, restartRequired });

    return {
      changedKeys,
      restartRequired,
      settings: this.settings
    };
  }

  save() {
    try {
      const tmp = this.filePath + '.tmp';

      fs.writeFileSync(tmp, JSON.stringify(this.settings, null, 2), 'utf8');
      fs.renameSync(tmp, this.filePath);
    } catch (e: any) {
      loggers.errors.error('ConfigSaveFailed', { error: e.message });
    }
  }

  addToWhitelist(host: string) {
    if (!this.settings.security.whitelist.includes(host)) {
      this.settings.security.whitelist.push(host);
      this.settings.security.blacklist = this.settings.security.blacklist.filter(h => h !== host);
      this.save();
    }
  }

  addToBlacklist(host: string) {
    if (!this.settings.security.blacklist.includes(host)) {
      this.settings.security.blacklist.push(host);
      this.settings.security.whitelist = this.settings.security.whitelist.filter(h => h !== host);
      this.save();
    }
  }

  removeWhitelist(host: string) {
    this.settings.security.whitelist = this.settings.security.whitelist.filter(h => h !== host);
    this.save();
  }

  removeBlacklist(host: string) {
    console.log('REMOVING FROM BLACKLIST', host);
    this.settings.security.blacklist = this.settings.security.blacklist.filter(h => h !== host);
    console.log('IS NOW', this.settings.security.blacklist);
    this.save();
  }

  clearDefaultPrinter() {
    this.settings.defaultPrinter = undefined;
    this.save();
  }

  setDefaultPrinter(name: string) {
    this.settings.defaultPrinter = name;
    this.save();
  }

  getDefaultPrinter(): string | undefined {
    return this.settings.defaultPrinter;
  }

  runtimeInfo(printers: string[]) {
    const stale = !!(this.settings.defaultPrinter && !printers.includes(this.settings.defaultPrinter));

    return {
      staleDefaultPrinter: stale,
      availablePrinters: printers,
      restartRequired: [],
      schemaVersion: CURRENT_SCHEMA_VERSION
    };
  }
}