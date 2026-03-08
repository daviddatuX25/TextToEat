import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { type ProxyService, type StartProxyInput, type ProxyResult } from './spec.js';
import { GcloudHandler } from '../gcloud/handler.js';
import { getStitchDir } from '../../platform/detector.js';
/**
 * Internal dependencies for testing
 */
export declare const deps: {
    createWriteStream: typeof createWriteStream;
    existsSync: typeof existsSync;
    mkdirSync: typeof mkdirSync;
    getStitchDir: typeof getStitchDir;
};
export declare class ProxyHandler implements ProxyService {
    private gcloud;
    private transportFactory;
    private currentToken;
    private refreshTimer;
    private pendingToolListIds;
    constructor(gcloud?: GcloudHandler, transportFactory?: () => StdioServerTransport);
    start(input: StartProxyInput): Promise<ProxyResult>;
    private refreshToken;
    private startRefreshTimer;
    private stopRefreshTimer;
}
