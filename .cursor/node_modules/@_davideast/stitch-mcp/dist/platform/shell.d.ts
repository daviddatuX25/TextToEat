export interface ShellResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    error?: string;
}
export declare function getSpawnArgs(command: string, args: string[]): {
    cmd: string;
    args: string[];
};
/**
 * Execute a shell command and return the result
 */
export declare function execCommand(command: string[], options?: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
}): Promise<ShellResult>;
/**
 * Execute a shell command and stream output
 */
export declare function execCommandStreaming(command: string[], onStdout?: (data: string) => void, onStderr?: (data: string) => void, options?: {
    cwd?: string;
    env?: Record<string, string>;
}): Promise<ShellResult>;
/**
 * Check if a command exists in PATH
 */
export declare function commandExists(command: string): Promise<boolean>;
