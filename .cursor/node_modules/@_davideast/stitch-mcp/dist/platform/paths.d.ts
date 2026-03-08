/**
 * Get cross-platform path join
 */
export declare function joinPath(...parts: string[]): string;
/**
 * Get the directory name from a path
 */
export declare function dirname(filepath: string): string;
/**
 * Get the basename from a path
 */
export declare function basename(filepath: string): string;
/**
 * Normalize path separators for the current platform
 */
export declare function normalizePath(filepath: string): string;
/**
 * Convert a path to use forward slashes (for consistency)
 */
export declare function toUnixPath(filepath: string): string;
