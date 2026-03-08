import { z } from 'zod';
export declare const StitchConfigSchema: z.ZodObject<{
    accessToken: z.ZodOptional<z.ZodString>;
    apiKey: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
    baseUrl: z.ZodDefault<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
    accessToken?: string | undefined;
    apiKey?: string | undefined;
    projectId?: string | undefined;
    timeout?: number | undefined;
}, {
    accessToken?: string | undefined;
    apiKey?: string | undefined;
    projectId?: string | undefined;
    baseUrl?: string | undefined;
    timeout?: number | undefined;
}>;
export type StitchConfig = z.infer<typeof StitchConfigSchema>;
export interface StitchMCPClientSpec {
    connect(): Promise<void>;
    callTool<T>(name: string, args: Record<string, any>): Promise<T>;
    getCapabilities(): Promise<any>;
    close(): Promise<void>;
}
