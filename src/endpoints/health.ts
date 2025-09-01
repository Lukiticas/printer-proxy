import { Request, RequestHandler, Response } from "express";
import { HealthResponse } from "../types";
import { loggers } from "../logging/logger";

export default function healthEndpoint(): RequestHandler {
    return async (_req: Request, res: Response<HealthResponse>) => {
        try {
            res.json({
                status: 'running',
                uptimeSeconds: process.uptime(),
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version,
            });
        } catch (e: any) {
            loggers.api.error('HealthCheckFailed', { error: e.message });

            return res.status(500).json({
                status: 'error',
                error: e.message || 'Internal error',
                timestamp: 'unknown',
                uptimeSeconds: 0,
                version: '0'
            });
        }
    }
}