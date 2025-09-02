export type PromptDecision = 'allow-once' | 'deny-once' | 'whitelist' | 'blacklist' | 'timeout';

export interface PromptResult {
  decision: PromptDecision;
  host: string;
  action: string;
}

export interface PromptProvider {
  prompt(host: string, action: string): Promise<PromptResult>;
}

export interface PendingEntry {
  host: string;
  firstSeen: number;
  lastAttempt: number;
  attempts: number;
  action: string;
  waiting: Array<(decision: DecisionOutcome) => void>;
  prompted: boolean;
}

export interface SecurityState {
  whitelist: string[];
  blacklist: string[];
  pending: PendingEntry[];
}

export type DecisionOutcome =
  | { type: 'allow'; scope: 'once' | 'permanent'; reason: string }
  | { type: 'deny'; scope: 'once' | 'permanent'; reason: string };

export interface SecurityStateResponse extends SecurityState {
  timestamp: string;
}

export interface securityDecisionResponse {
  success: true;
  host: string;
  decision: 'whitelist' | 'blacklist' | 'allow-once' | 'deny-once';
}

export interface SecurityListingResponse {
  success: true;
  host: string;
}