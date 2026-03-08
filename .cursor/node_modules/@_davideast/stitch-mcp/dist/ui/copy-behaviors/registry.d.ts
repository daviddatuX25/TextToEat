/**
 * Registry for path-based copy handler selection.
 */
import type { CopyHandler, PathMatcher } from './types.js';
import { defaultCopyHandler, imageUrlCopyHandler, htmlCodeCopyHandler } from './handlers.js';
/**
 * Register a handler for paths matching the given pattern.
 * Later registrations take precedence over earlier ones.
 */
export declare function registerHandler(matcher: PathMatcher, handler: CopyHandler): void;
/**
 * Get the appropriate handler for a given path.
 * Returns the most recently registered matching handler, or default.
 */
export declare function getHandler(path: string): CopyHandler;
/**
 * Create a matcher that checks if path ends with the given suffix.
 */
export declare function endsWith(suffix: string): PathMatcher;
/**
 * Create a matcher that checks if path contains the given segment.
 */
export declare function contains(segment: string): PathMatcher;
export { defaultCopyHandler, imageUrlCopyHandler, htmlCodeCopyHandler };
