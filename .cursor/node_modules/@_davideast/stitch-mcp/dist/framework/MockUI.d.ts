import { type UserInterface } from './UserInterface.js';
import type { McpClient } from '../ui/wizard.js';
export declare class MockUI implements UserInterface {
    private readonly data;
    constructor(data: Record<string, any>);
    promptMcpClient(): Promise<McpClient>;
    promptAuthMode(): Promise<'apiKey' | 'oauth'>;
    promptTransportType(authMode?: 'apiKey' | 'oauth'): Promise<'http' | 'stdio'>;
    promptApiKeyStorage(): Promise<'config' | 'skip' | '.env'>;
    promptApiKey(): Promise<string>;
    promptConfirm(message: string, defaultYes?: boolean): Promise<boolean>;
    log(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    success(message: string): void;
}
