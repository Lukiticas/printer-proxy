import path from 'path';
import { app } from 'electron';

export function resolveAsset(...segments: string[]) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', ...segments);
  }

  return path.join(process.cwd(), 'assets', ...segments);
}