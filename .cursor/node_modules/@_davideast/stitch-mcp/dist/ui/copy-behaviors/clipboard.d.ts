/**
 * Copy text to clipboard
 */
export declare function copyText(text: string): Promise<void>;
/**
 * Copy JSON-serialized value to clipboard
 */
export declare function copyJson(value: any): Promise<void>;
/**
 * Download an image from URL and copy to clipboard.
 * Uses platform-specific commands for image clipboard.
 */
/**
 * Download an image from URL.
 */
export declare function downloadImage(url: string): Promise<ArrayBuffer>;
/**
 * Download an image from URL and copy to clipboard.
 * Uses platform-specific commands for image clipboard.
 */
export declare function downloadAndCopyImage(url: string): Promise<void>;
/**
 * Download text content from URL and copy to clipboard.
 */
/**
 * Download text content from URL.
 */
export declare function downloadText(url: string): Promise<string>;
/**
 * Download text content from URL and copy to clipboard.
 */
export declare function downloadAndCopyText(url: string): Promise<void>;
