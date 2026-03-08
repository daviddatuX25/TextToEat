export type OS = 'macos' | 'linux' | 'windows';
export type Arch = 'arm64' | 'x86_64';
export interface Platform {
    os: OS;
    arch: Arch;
    gcloudDownloadUrl: string;
    gcloudBinaryName: string;
    isWindows: boolean;
}
/**
 * Detect the current platform and architecture
 */
export declare function detectPlatform(): Platform;
/**
 * Get the user's home directory
 */
export declare function getHomeDir(): string;
/**
 * Get the Stitch MCP directory path
 */
export declare function getStitchDir(): string;
/**
 * Get the gcloud SDK installation path
 */
export declare function getGcloudSdkPath(): string;
/**
 * Get the gcloud config directory path
 */
export declare function getGcloudConfigPath(): string;
