/**
 * Copy handlers - isolated behavior implementations.
 */
import type { CopyHandler } from './types.js';
/**
 * Default handler: copies value on "c", copies {key: value} on "cc"
 */
export declare const defaultCopyHandler: CopyHandler;
/**
 * Image URL handler: copies URL on "c", downloads and copies image on "cc"
 */
export declare const imageUrlCopyHandler: CopyHandler;
/**
 * HTML code URL handler: copies URL on "c", downloads and copies HTML code on "cc"
 */
export declare const htmlCodeCopyHandler: CopyHandler;
