/**
 * Serve handlers - isolated behavior implementations.
 */
import type { ServeHandler } from './types.js';
import { serveHtmlInMemory } from './server.js';
export declare const deps: {
    serveHtmlInMemory: typeof serveHtmlInMemory;
};
export declare const htmlCodeServeHandler: ServeHandler;
