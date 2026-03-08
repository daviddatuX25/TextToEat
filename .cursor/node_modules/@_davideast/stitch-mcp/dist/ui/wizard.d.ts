export type McpClient = 'antigravity' | 'vscode' | 'cursor' | 'claude-code' | 'gemini-cli' | 'codex' | 'opencode';
/**
 * Prompt user to select their MCP client
 */
export declare function promptMcpClient(): Promise<McpClient>;
/**
 * Prompt user to select Authentication Mode
 */
export declare function promptAuthMode(): Promise<'apiKey' | 'oauth'>;
/**
 * Prompt user to select API Key storage
 */
export declare function promptApiKeyStorage(): Promise<'.env' | 'config' | 'skip'>;
/**
 * Prompt user to enter API Key
 */
export declare function promptApiKey(): Promise<string>;
/**
 * Prompt user to select from a list of options
 */
export declare function promptSelect<T extends string>(message: string, choices: Array<{
    name: string;
    value: T;
}>): Promise<T>;
/**
 * Prompt user to enter text
 */
export declare function promptInput(message: string, defaultValue?: string): Promise<string>;
/**
 * Prompt user for confirmation
 */
export declare function promptConfirm(message: string, defaultValue?: boolean): Promise<boolean>;
/**
 * Prompt user to select transport type
 */
export declare function promptTransportType(authMode?: 'apiKey' | 'oauth'): Promise<'http' | 'stdio'>;
