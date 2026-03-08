import { z } from 'zod';
export declare const StartProxyInputSchema: z.ZodObject<{
    transport: z.ZodDefault<z.ZodEnum<["stdio", "sse"]>>;
    port: z.ZodOptional<z.ZodNumber>;
    debug: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    transport: "stdio" | "sse";
    debug?: boolean | undefined;
    port?: number | undefined;
}, {
    debug?: boolean | undefined;
    port?: number | undefined;
    transport?: "stdio" | "sse" | undefined;
}>;
export type StartProxyInput = z.infer<typeof StartProxyInputSchema>;
export declare const ProxyErrorCode: z.ZodEnum<["START_FAILED", "TRANSPORT_ERROR", "AUTH_REFRESH_FAILED", "UNKNOWN_ERROR"]>;
export type ProxyErrorCodeType = z.infer<typeof ProxyErrorCode>;
export declare const ProxySuccess: z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodObject<{
        status: z.ZodEnum<["running", "stopped"]>;
    }, "strip", z.ZodTypeAny, {
        status: "running" | "stopped";
    }, {
        status: "running" | "stopped";
    }>;
}, "strip", z.ZodTypeAny, {
    success: true;
    data: {
        status: "running" | "stopped";
    };
}, {
    success: true;
    data: {
        status: "running" | "stopped";
    };
}>;
export declare const ProxyFailure: z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodObject<{
        code: z.ZodEnum<["START_FAILED", "TRANSPORT_ERROR", "AUTH_REFRESH_FAILED", "UNKNOWN_ERROR"]>;
        message: z.ZodString;
        suggestion: z.ZodOptional<z.ZodString>;
        recoverable: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        code: "UNKNOWN_ERROR" | "START_FAILED" | "TRANSPORT_ERROR" | "AUTH_REFRESH_FAILED";
        message: string;
        recoverable: boolean;
        suggestion?: string | undefined;
    }, {
        code: "UNKNOWN_ERROR" | "START_FAILED" | "TRANSPORT_ERROR" | "AUTH_REFRESH_FAILED";
        message: string;
        recoverable: boolean;
        suggestion?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    success: false;
    error: {
        code: "UNKNOWN_ERROR" | "START_FAILED" | "TRANSPORT_ERROR" | "AUTH_REFRESH_FAILED";
        message: string;
        recoverable: boolean;
        suggestion?: string | undefined;
    };
}, {
    success: false;
    error: {
        code: "UNKNOWN_ERROR" | "START_FAILED" | "TRANSPORT_ERROR" | "AUTH_REFRESH_FAILED";
        message: string;
        recoverable: boolean;
        suggestion?: string | undefined;
    };
}>;
export type ProxyResult = z.infer<typeof ProxySuccess> | z.infer<typeof ProxyFailure>;
export interface ProxyService {
    /**
     * Start the MCP proxy server
     *
     * @remarks
     * This is a long-running operation. The promise settles only when the server stops
     * or if initial startup fails.
     */
    start(input: StartProxyInput): Promise<ProxyResult>;
}
