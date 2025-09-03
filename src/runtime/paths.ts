import { app } from "electron";
import path from "path";

export function resolvePublicPath(...segments: string[]): string {
  if (app?.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar', 'dist-runtime', 'public', ...segments);
  }

  if (process.env.RESOURCE_DIR) {
    return path.join(process.env.RESOURCE_DIR, 'dist-runtime', 'public', ...segments);
  }

  return path.join(process.cwd(), 'dist-runtime', 'public', ...segments);
}

export function resolveAssetsPath(...segments: string[]): string {
  if (app?.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar', 'assets', ...segments);
  }

  if (process.env.RESOURCE_DIR) {
    return path.join(process.env.RESOURCE_DIR, ...segments);
  }

  return path.join(process.cwd(), 'assets', ...segments);
}

export function resolveUserDataPath(...segments: string[]): string {
  if (app?.isPackaged) {
    return path.join(app.getPath('userData'), ...segments);
  }

  if (process.env.DATA_DIR) {
    return path.join(process.env.DATA_DIR, ...segments);
  }

  return path.join(process.cwd(), 'data', ...segments);
}

export function resolveSettingsPath(...segments: string[]): string {
  if (app?.isPackaged) {
    return path.join(resolveUserDataPath('settings'), ...segments);
  }

  if (process.env.SETTINGS_DIR) {
    return path.join(process.env.SETTINGS_DIR, ...segments);
  }

  return resolveUserDataPath('settings', ...segments);
}

export function resolveLogPath(...segments: string[]): string {
  if (app?.isPackaged) {
    return path.join(resolveUserDataPath('logs'), ...segments);
  }

  if (process.env.LOG_DIR) {
    return path.join(process.env.LOG_DIR, ...segments);
  }

  return resolveUserDataPath('logs', ...segments);
}

export function resolveScriptPath(...segments: string[]): string {
  if (app?.isPackaged) {
    return path.join(resolveUserDataPath('scripts'), ...segments);
  }

  if (process.env.SCRIPT_DIR) {
    return path.join(process.env.SCRIPT_DIR, ...segments);
  }

  return resolveUserDataPath('scripts', ...segments);
}

export function resolveServerCorePath(): string {
  if (app?.isPackaged) {
    return path.join(
      process.resourcesPath,
      'app.asar',
      'dist-runtime',
      'src',
      'runtime',
      'server-core.js'
    );
  }

  return path.join(process.cwd(), 'dist-runtime', 'src', 'runtime', 'server-core.js');
}

export function resolveEarlyLogPath(...segments: string[]): string {
  return path.join(process.env.APPDATA || process.cwd(), 'printer-proxy-early', ...segments);
}