import { dialog } from 'electron';
import { PromptProvider, PromptResult } from '../src/types';

export class TrayPromptProvider implements PromptProvider {
  async prompt(host: string, action: string): Promise<PromptResult> {

    const index = await dialog.showMessageBox({
      type: 'question',
      title: 'Printer Proxy Security',
      message: `${host} requests action: ${action}`,
      detail: 'Choose how to proceed.',
      buttons: ['Allow Once', 'Deny Once', 'Whitelist', 'Blacklist'],
      cancelId: 1,
      defaultId: 0,
      noLink: true
    });

    const map: Record<number, PromptResult['decision']> = {
      0: 'allow-once',
      1: 'deny-once',
      2: 'whitelist',
      3: 'blacklist'
    };

    return { decision: map[index.response] || 'deny-once', host, action };
  }
}