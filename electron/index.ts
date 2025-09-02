require('dotenv').config();

import { app, Tray, Menu, shell, nativeImage, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { startServerOutput } from '../src/types';
import { resolveAsset } from './asset-path';

let tray: Tray | null = null;
let serverHandle: startServerOutput | null = null;

const isDevEnv = process.env.ELECTRON_DEV === '1';

async function loadServerCore(): Promise<{ startServer: (opts?: any) => Promise<startServerOutput> }> {
  return new Promise(async (resolve, reject) => {
    try {
      if (isDevEnv) {
        resolve(await require('../src/runtime/server-core'))
      } else {
        resolve(await require('../dist-runtime/src/runtime/server-core'));
      }
    } catch (e) {
      reject(e);
    }
  })
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

async function startBackend() {
  const { startServer } = await loadServerCore();
  serverHandle = await startServer();
  console.log('[electron] Backend server started', serverHandle.settings);
}

function buildMenu() {
  if (!tray || !serverHandle) {
    return;
  }

  const settings = serverHandle.settings;

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Settings',
      click: () => {
        shell.openExternal(`http://${settings.host}:${settings.port}/settings`);
      }
    },
    {
      label: 'Open Logs Folder',
      click: () => {
        if (process.env.LOG_DIR) shell.openPath(process.env.LOG_DIR);
      }
    },
    {
      label: 'Reload Config (.env)',
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
      label: 'Restart Server',
      click: async () => {
        try {
          await serverHandle?.stop();
          await startBackend();

          buildMenu();
        } catch (e: any) {
          dialog.showErrorBox('Restart Failed', e.message || String(e));
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: async () => {
        await gracefulQuit();
      }
    }
  ]);

  tray.setContextMenu(menu);
  tray.setToolTip('Printer Proxy');
}

async function createTray() {
  const iconPath = resolveAsset('icon.ico');
  const image = nativeImage.createFromPath(iconPath);

  if (image.isEmpty()) {
    console.warn('Tray icon failed to load at', iconPath);
  }

  tray = new Tray(image);
  tray.setToolTip('Printer Proxy');

  buildMenu();
}

async function gracefulQuit() {
  try {
    if (serverHandle?.stop) {
      await serverHandle.stop();
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error stopping server', e);
  }

  app.exit(0);
}

async function bootstrap() {
  await app.whenReady();

  const userData = app.getPath('userData');
  ensureDirs(userData);

  await startBackend();
  await createTray();

  app.setLoginItemSettings({ openAtLogin: true, enabled: true });

  app.on('before-quit', (e) => {
    e.preventDefault();
    gracefulQuit();
  });
}

bootstrap().catch(err => {
  console.error('Fatal Electron bootstrap error', err);

  try {
    app?.exit(1);
  } catch {
    process.exit(1);
  }
});