import { applyPartialOutput, PartialSettingsInput, SettingsData, validateSettingsOutput } from "../types/schema";

export const CURRENT_SCHEMA_VERSION = 1;

export function defaultSettings(): SettingsData {
    return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        host: 'localhost',
        port: 9100,
        defaultPrinter: undefined,
        security: {
            mode: 'allowAll',
            whitelist: [],
            blacklist: [],
            promptMode: 'popup'
        },
        ui: {}
    };
}

export function validateSettings(obj: any): validateSettingsOutput {
    const errors: string[] = [];

    if (!obj || typeof obj !== 'object') {
        return { valid: false, errors: ['Settings must be an object'] };
    }

    const checks: [boolean, string][] = [
        [obj.schemaVersion === CURRENT_SCHEMA_VERSION, `Unsupported schemaVersion (expected ${CURRENT_SCHEMA_VERSION})`],
        [typeof obj.host === 'string' && !!obj.host.trim(), 'host must be a non-empty string'],
        [typeof obj.port === 'number' && Number.isInteger(obj.port) && obj.port >= 1 && obj.port <= 65535, 'port must be an integer between 1 and 65535'],
        [obj.defaultPrinter === undefined || typeof obj.defaultPrinter === 'string', 'defaultPrinter must be a string if provided'],
        [obj.security && typeof obj.security === 'object', 'security object missing'],
        [obj.security?.mode === 'allowAll', 'security.mode must be allowAll'],
        [Array.isArray(obj.security?.whitelist), 'security.whitelist must be an array'],
        [Array.isArray(obj.security?.blacklist), 'security.blacklist must be an array'],
        [obj.ui && typeof obj.ui === 'object', 'ui object missing'],
    ];

    for (const [condition, message] of checks) {
        if (!condition) errors.push(message);
    }

    return {
        valid: errors.length === 0,
        errors,
        value: errors.length === 0 ? obj as SettingsData : undefined
    };
}

export function applyPartial(current: SettingsData, patch: PartialSettingsInput): applyPartialOutput {
    const updated: SettingsData = { ...current };
    const changedKeys: string[] = [];
    const restartRequired: string[] = [];

    if (patch.host !== undefined && patch.host !== current.host) {
        updated.host = patch.host;
        changedKeys.push('host');
        restartRequired.push('host');
    }
    if (patch.port !== undefined && patch.port !== current.port) {
        updated.port = patch.port;
        changedKeys.push('port');
        restartRequired.push('port');
    }
    if (patch.defaultPrinter !== undefined && patch.defaultPrinter !== current.defaultPrinter) {
        updated.defaultPrinter = patch.defaultPrinter;
        changedKeys.push('defaultPrinter');
    }

    return {
        updated,
        changedKeys,
        restartRequired
    };
}