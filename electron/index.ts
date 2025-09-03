import fs from 'fs';
import path from 'path';

function writeEarly(line: string, data?: any) {
  try {
    const base = process.env.APPDATA || process.cwd();
    const earlyDir = path.join(base, 'PrinterProxyEarly');

    if (!fs.existsSync(earlyDir)) {
      fs.mkdirSync(earlyDir, { recursive: true });
    }

    const f = path.join(earlyDir, 'early.log');
    const string = `[${new Date().toISOString()}] ${line}${data ? ' ' + JSON.stringify(data, null, 2) : ''}\n`;

    fs.appendFileSync(f, string);
    console.log(string);
  } catch (err: any) {
    console.log('[writeEarly] failed', { line, error: err.message });
  }
}

process.on('uncaughtException', err => {
  writeEarly('uncaughtException', { message: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason: any) => {
  writeEarly('unhandledRejection', {
    reason: reason && reason.stack ? reason.stack : reason
  });
});

require('dotenv').config();

import { app, Tray, Menu, shell, nativeImage, dialog, Notification } from 'electron';
import { startServerOutput } from '../src/types';
import { resolveAsset } from './asset-path';

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  writeEarly('single-instance-deny');
  app.quit();

  // Important: return so the rest of the file doesn’t execute.
  // (In TypeScript compiled output this prevents further side effects.)
  // @ts-ignore
  return;
} else {
  writeEarly('single-instance-acquired');
}

let trayRef: Tray | null = null;

let tray: Tray | null = null;
let serverHandle: startServerOutput | null = null;
const isDevEnv = process.env.ELECTRON_DEV === '1';

let startupLogFile: string | null = null;

function logStartup(event: string, data?: any) {
  try {
    if (!startupLogFile) {
      writeEarly('startup-buffer', { event, data });
      return;
    }

    const string = `[${new Date().toISOString()}] ${event}${data ? ' ' + JSON.stringify(data, null, 2) : ''}\n`;

    fs.appendFileSync(startupLogFile, string);
    console.log(string)
  } catch (e: any) {
    writeEarly('logStartup-failed', { event, error: e.message });
    console.log('[logStartup] failed', { event, error: e.message })
  }
}

function initStartupLogger() {
  try {
    const userData = app.getPath('userData');
    const logsDir = path.join(userData, 'logs');

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    startupLogFile = path.join(logsDir, 'startup.log');

    const earlyDir = path.join(process.env.APPDATA || process.cwd(), 'PrinterProxyEarly');
    const earlyFile = path.join(earlyDir, 'early.log');

    if (fs.existsSync(earlyFile)) {
      const content = fs.readFileSync(earlyFile);
      fs.appendFileSync(startupLogFile, content);
    }

    logStartup('logger-initialized', { userData, logsDir });
  } catch (e: any) {
    writeEarly('initStartupLogger-failed', { message: e.message });
  }
}

function ensureDirs(userData: string) {
  const logDir = path.join(userData, 'logs');
  const dataDir = path.join(userData, 'data');

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  process.env.LOG_DIR = logDir;
  process.env.DATA_DIR = dataDir;

  return { logDir, dataDir };
}

function resolveServerCorePath(): string {
  if (app.isPackaged) {
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

async function loadServerCore(): Promise<{ startServer: (opts?: any) => Promise<startServerOutput> }> {
  const serverCorePath = resolveServerCorePath();
  logStartup('server-core-resolve', { serverCorePath, isPackaged: app.isPackaged });

  if (!fs.existsSync(serverCorePath)) {
    logStartup('server-core-missing', { serverCorePath });
    throw new Error('Server core not found at ' + serverCorePath);
  }

  const mod = require(serverCorePath);

  const startServer =
    mod.startServer ||
    mod.default ||
    mod.run ||
    mod.main;

  if (typeof startServer !== 'function') {
    logStartup('server-core-no-start-fn', { keys: Object.keys(mod) });
    throw new Error('No start function in server-core exports');
  }

  return { startServer };
}

async function startBackend() {
  const { startServer } = await loadServerCore();

  serverHandle = await startServer();

  logStartup('backend-started', {
    host: serverHandle.settings?.host,
    port: serverHandle.settings?.port
  });
}

function buildMenu() {
  if (!tray) {
    return;
  }

  const settings = serverHandle?.settings;

  const menu = Menu.buildFromTemplate([
    {
      label: 'Abrir Configurações',
      enabled: !!settings,
      click: () => {
        if (settings) shell.openExternal(`http://${settings.host}:${settings.port}/settings`);
      }
    },
    {
      label: 'Abrir Logs',
      click: () => {
        if (process.env.LOG_DIR) shell.openPath(process.env.LOG_DIR);
      }
    },
    {
      label: 'Recarregar Configurações do .env',
      click: async () => {
        try {
          if (!serverHandle?.configService) {
            throw new Error('Config service not available');
          }

          serverHandle.configService.reloadFromEnv();
          dialog.showMessageBox({ message: 'Reloaded from .env (if present)', type: 'info' });
        } catch (e: any) {
          dialog.showErrorBox('Config Reload Failed', e.message || String(e));
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Reiniciar aplicação',
      click: async () => {
        try {
          await serverHandle?.stop?.();
          serverHandle = null;
          await startBackend();
          buildMenu();
        } catch (e: any) {
          dialog.showErrorBox('Restart Failed', e.message || String(e));
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Fechar',
      click: async () => {
        await gracefulQuit();
      }
    }
  ]);

  tray.setContextMenu(menu);
  tray.setToolTip('Companion Vida Exame');
}

async function createTray() {
  const iconPath = resolveAsset('icon.ico');
  const image = nativeImage.createFromPath(iconPath);

  if (image.isEmpty()) {
    logStartup('tray-icon-empty', { iconPath });
  } else {
    logStartup('tray-icon-loaded', { iconPath });
  }

  tray = new Tray(image);
  trayRef = tray;
  tray.setToolTip('Printer Proxy');

  buildMenu();
}

async function gracefulQuit() {
  try {
    if (serverHandle?.stop) {
      await serverHandle.stop();
    }
  } catch (e) {
    logStartup('gracefulQuit-error', { message: (e as any).message });
  }

  app.exit(0);
}

function testNativeModule() {
  try {
    const printer = require('@grandchef/node-printer');
    logStartup('native-module-loaded', { keys: Object.keys(printer) });
  } catch (e: any) {
    logStartup('native-module-failed', { message: e.message, stack: e.stack });
  }
}

app.on('second-instance', (_event, argv, workingDir) => {
  logStartup('second-instance', { argv, workingDir });

  try {
    if (trayRef?.displayBalloon) {
      trayRef.displayBalloon({
        title: 'Companion Vida Exame',
        content: 'Já está em execução.'
      });
    } else if (Notification.isSupported()) {
      new Notification({
        title: 'Companion Vida Exame',
        body: 'Já está em execução.'
      })
        .show();
    }
  } catch (e: any) {
    logStartup('second-instance-notify-failed', { message: e.message });
  }
});

async function bootstrap() {
  logStartup('bootstrap-start', {
    isDevEnv,
    versions: process.versions,
    cwd: process.cwd(),
    dirname: __dirname
  });

  await app.whenReady();

  initStartupLogger();

  logStartup('app-whenReady', {
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath
  });

  const userData = app.getPath('userData');

  ensureDirs(userData);
  testNativeModule();

  try {
    await startBackend();
  } catch (e: any) {
    logStartup('backend-start-error', { message: e.message, stack: e.stack });
  }

  await createTray();

  try {
    app.setLoginItemSettings({ openAtLogin: true, enabled: true });
  } catch (e: any) {
    logStartup('loginItemSettings-failed', { message: e.message });
  }

  app.on('before-quit', (e) => {
    e.preventDefault();
    gracefulQuit();
  });
}

bootstrap().catch(err => {
  logStartup('bootstrap-fatal', { message: err.message, stack: err.stack });

  try {
    app.exit(1);
  } catch {
    process.exit(1);
  }
});