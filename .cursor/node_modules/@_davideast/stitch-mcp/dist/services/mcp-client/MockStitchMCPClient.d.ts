import { StitchMCPClient } from './client.js';
export declare class MockStitchMCPClient extends StitchMCPClient {
    private mockScreens;
    constructor(mockScreens: any[]);
    connect(): Promise<void>;
    callTool<T>(name: string, args: Record<string, any>): Promise<T>;
}
