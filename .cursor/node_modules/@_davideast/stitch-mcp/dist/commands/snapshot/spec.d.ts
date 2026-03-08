import { z } from 'zod';
export declare const SnapshotInputSchema: z.ZodObject<{
    command: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodString>;
    schema: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    schema: boolean;
    data?: string | undefined;
    command?: string | undefined;
}, {
    data?: string | undefined;
    command?: string | undefined;
    schema?: boolean | undefined;
}>;
export type SnapshotInput = z.infer<typeof SnapshotInputSchema>;
export declare const SnapshotResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    error: z.ZodOptional<z.ZodObject<{
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
    }, {
        message: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    error?: {
        message: string;
    } | undefined;
}, {
    success: boolean;
    error?: {
        message: string;
    } | undefined;
}>;
export type SnapshotResult = z.infer<typeof SnapshotResultSchema>;
export interface SnapshotCommand {
    execute(input: SnapshotInput): Promise<SnapshotResult>;
}
