import { NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { loggers } from '../logging/logger';
import { LoggedRequest, ResponseMetaTracking } from '../types';

export function requestLogger() {
    return (req: LoggedRequest, res: ResponseMetaTracking, next: NextFunction) => {
        const requestId = uuid();

        req.requestId = requestId;
        res.__startTime = Date.now();

        const chunks: Buffer[] = [];
        const origSend = res.send.bind(res);

        (res as any).send = (body?: any) => {
            try {
                if (body !== undefined) {
                    if (Buffer.isBuffer(body)) {
                        chunks.push(body);
                    } else if (typeof body === 'string') {
                        chunks.push(Buffer.from(body));
                    } else {
                        const json = Buffer.from(JSON.stringify(body));
                        chunks.push(json);
                    }
                }
            } catch {
                /* ignore size calc errors */
            }

            return origSend(body);
        };

        res.on('finish', () => {
            const durationMs = Date.now() - (res.__startTime || Date.now());
            const bytesIn = req.socket.bytesRead;
            const bytesOut = chunks.reduce((acc, b) => acc + b.length, 0);
            const bodyPreview = (() => {
                if (!req.body) {
                    return undefined;
                }

                let raw: string;

                if (typeof req.body === 'string') {
                    raw = req.body;
                } else {
                    try {
                        raw = JSON.stringify(req.body);
                    } catch {
                        raw = '[unserializable]';
                    }
                }

                if (raw.length > 300) {
                    return raw.slice(0, 300) + '...';
                }

                return raw;
            })();

            loggers.api.info('HTTP', {
                requestId,
                method: req.method,
                path: req.originalUrl || req.url,
                status: res.statusCode,
                durationMs,
                bytesIn,
                bytesOut,
                ip: req.ip,
                bodyPreview,
            });
        });

        next();
    };
}