import { ConfigService } from '../config/config-service';
import { loggers } from '../logging/logger';
import { DecisionOutcome, PendingEntry, PromptProvider, PromptResult, SecurityState } from '../types';

export class SecurityService {
  private config: ConfigService;
  private prompt: PromptProvider;
  private pending: Map<string, PendingEntry> = new Map();

  constructor(config: ConfigService, promptProvider: PromptProvider) {
    this.config = config;
    this.prompt = promptProvider;
  }

  normalizeHost(raw: string): string {
    let h = raw.trim().toLowerCase();

    h = h.replace(/^https?:\/\//, '');
    h = h.split('/')[0];
    h = h.split(':')[0];
    h = h.replace(/^\[(.*)\]$/, '$1');

    if (h === '::1') {
      h = '127.0.0.1';
    }

    return h;
  }

  classifyAction(method: string, path: string): string {
    const actionMap: Array<[RegExp | string, string | ((method: string) => string)]> = [
      ['/write', (method) => method === 'POST' ? 'print' : 'other'],
      ['/config', (method) => method === 'GET' ? 'config-read' : 'config-update'],
      ['/available', 'enumerate'],
      ['/health', 'health'],
      ['/settings', 'settings-ui']
    ];

    for (const [pathPattern, action] of actionMap) {
      if (path.startsWith(pathPattern as string)) {
        return typeof action === 'function' ? action(method) : action;
      }
    }

    return 'other';
  }

  isLoopback(host: string): boolean {
    return ['localhost', '127.0.0.1'].includes(host);
  }

  inWhitelist(host: string): boolean {
    return this.config.get().security.whitelist.includes(host);
  }

  inBlacklist(host: string): boolean {
    return this.config.get().security.blacklist.includes(host);
  }

  getState(): SecurityState {
    return {
      whitelist: [...this.config.get().security.whitelist],
      blacklist: [...this.config.get().security.blacklist],
      pending: Array.from(this.pending.values()).map(p => ({
        host: p.host,
        firstSeen: p.firstSeen,
        lastAttempt: p.lastAttempt,
        attempts: p.attempts,
        action: p.action,
        prompted: p.prompted,
        waiting: p.waiting
      }))
    };
  }

  whitelist(host: string) {
    this.config.addToWhitelist(host);
  }

  blacklist(host: string) {
    this.config.addToBlacklist(host);
  }

  removeWhitelist(host: string) {
    this.config.removeWhitelist(host);
  }

  removeBlacklist(host: string) {
    this.config.removeBlacklist(host);
  }

  private ensurePending(host: string, action: string): PendingEntry {
    let entry = this.pending.get(host);

    if (!entry) {
      entry = {
        host,
        firstSeen: Date.now(),
        lastAttempt: Date.now(),
        attempts: 0,
        action,
        waiting: [],
        prompted: false
      };

      this.pending.set(host, entry);
      loggers.security.info('SecurityPendingCreated', { host, action });
    }

    entry.attempts += 1;
    entry.lastAttempt = Date.now();

    return entry;
  }

  async evaluate(host: string, action: string): Promise<DecisionOutcome> {
    if (this.inBlacklist(host)) {
      loggers.security.warn('SecurityBlocked', { host, reason: 'blacklist' });
      return {
        type: 'deny',
        scope: 'permanent',
        reason: 'blacklist'
      };
    }

    if (this.inWhitelist(host)) {
      loggers.security.info('SecurityAllowed', { host, reason: 'whitelist' });
      return {
        type: 'allow',
        scope: 'permanent',
        reason: 'whitelist'
      };
    }

    const pending = this.ensurePending(host, action);

    return await new Promise<DecisionOutcome>((resolve) => {
      pending.waiting.push(resolve);

      if (pending.prompted) {
        return;
      }

      pending.prompted = true;

      this.prompt.prompt(host, action).then((result: PromptResult) => {
        let decision: DecisionOutcome;
        switch (result.decision) {
          case 'whitelist':
            this.whitelist(host);
            decision = { type: 'allow', scope: 'permanent', reason: 'whitelist' };
            loggers.security.info('SecurityDecision', { host, decision: 'whitelist' });
            break;
          case 'blacklist':
            this.blacklist(host);
            decision = { type: 'deny', scope: 'permanent', reason: 'blacklist' };
            loggers.security.info('SecurityDecision', { host, decision: 'blacklist' });
            break;
          case 'allow-once':
            decision = { type: 'allow', scope: 'once', reason: 'allow-once' };
            loggers.security.info('SecurityDecision', { host, decision: 'allow-once' });
            break;
          case 'timeout':
          case 'deny-once':
          default:
            decision = { type: 'deny', scope: 'once', reason: result.decision === 'timeout' ? 'timeout' : 'deny-once' };
            loggers.security.info('SecurityDecision', { host, decision: decision.reason });
            break;
        }

        const waiters = pending.waiting.splice(0);
        waiters.forEach(w => w(decision));

        this.pending.delete(host);
      }).catch(err => {
        loggers.security.error('SecurityPromptFailed', { host, error: err.message });

        const waiters = pending.waiting.splice(0);
        const decision: DecisionOutcome = { type: 'deny', scope: 'once', reason: 'prompt-error' };

        waiters.forEach(w => w(decision));

        this.pending.delete(host);
      });
    });
  }
}