export interface EnvironmentInfo {
    isWSL: boolean;
    isSSH: boolean;
    isDocker: boolean;
    isCloudShell: boolean;
    hasDisplay: boolean;
    needsNoBrowser: boolean;
    reason?: string;
}
/**
 * Detect environment characteristics that affect browser auth
 */
export declare function detectEnvironment(): EnvironmentInfo;
