/**
 * Registry for path-based serve handler selection.
 */
import type { ServeHandler, PathMatcher } from './types.js';
import { htmlCodeServeHandler } from './handlers.js';
export declare function registerServeHandler(matcher: PathMatcher, handler: ServeHandler): void;
export declare function getServeHandler(path: string): ServeHandler | null;
export declare function endsWith(suffix: string): PathMatcher;
export declare function contains(segment: string): PathMatcher;
export { htmlCodeServeHandler };
