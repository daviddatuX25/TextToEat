import { type StitchConfig, type StitchMCPClientSpec } from './spec.js';
/**
 * A robust, authenticated driver for the Stitch MCP Server.
 * Handles auth injection, retries, and transport negotiation.
 */
export declare class StitchMCPClient implements StitchMCPClientSpec {
    name: 'stitch-mcp-client';
    description: 'Authenticated driver for Stitch MCP Server';
    private client;
    private transport;
    private config;
    private isConnected;
    constructor(inputConfig?: Partial<StitchConfig>);
    /**
     * Auto-refreshes the Google Access Token via GcloudHandler.
     * This ensures we use the bundled gcloud with proper CLOUDSDK_CONFIG.
     */
    private refreshGcloudToken;
    /**
     * Validates the token against Google's tokeninfo endpoint.
     */
    private validateToken;
    /**
     * Monkey-patches global fetch to ensure headers are ALWAYS present.
     * This fixes issues where SDK layers might drop headers on redirects or retries.
     */
    private installNetworkInterceptor;
    connect(): Promise<void>;
    /**
     * Generic tool caller with type support and error parsing.
     */
    callTool<T>(name: string, args: Record<string, any>): Promise<T>;
    getCapabilities(): Promise<{
        [x: string]: unknown;
        tools: {
            inputSchema: {
                [x: string]: unknown;
                type: "object";
                properties?: Record<string, object> | undefined;
                required?: string[] | undefined;
            };
            name: string;
            description?: string | undefined;
            outputSchema?: {
                [x: string]: unknown;
                type: "object";
                properties?: Record<string, object> | undefined;
                required?: string[] | undefined;
            } | undefined;
            annotations?: {
                title?: string | undefined;
                readOnlyHint?: boolean | undefined;
                destructiveHint?: boolean | undefined;
                idempotentHint?: boolean | undefined;
                openWorldHint?: boolean | undefined;
            } | undefined;
            execution?: {
                taskSupport?: "optional" | "required" | "forbidden" | undefined;
            } | undefined;
            _meta?: Record<string, unknown> | undefined;
            icons?: {
                src: string;
                mimeType?: string | undefined;
                sizes?: string[] | undefined;
                theme?: "light" | "dark" | undefined;
            }[] | undefined;
            title?: string | undefined;
        }[];
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
        nextCursor?: string | undefined;
    }>;
    close(): Promise<void>;
}
