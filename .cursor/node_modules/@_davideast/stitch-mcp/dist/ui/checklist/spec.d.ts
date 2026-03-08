import { z } from 'zod';
export declare const ChecklistItemState: z.ZodEnum<["PENDING", "IN_PROGRESS", "COMPLETE", "SKIPPED", "FAILED"]>;
export type ChecklistItemStateType = z.infer<typeof ChecklistItemState>;
export declare const ChecklistItemSchema: z.ZodType<ChecklistItem>;
export type ChecklistItem = {
    id: string;
    label: string;
    children?: ChecklistItem[];
};
export declare const ChecklistConfigSchema: z.ZodObject<{
    title: z.ZodDefault<z.ZodString>;
    items: z.ZodArray<z.ZodType<ChecklistItem, z.ZodTypeDef, ChecklistItem>, "many">;
    showProgress: z.ZodDefault<z.ZodBoolean>;
    animationDelayMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    title: string;
    items: ChecklistItem[];
    showProgress: boolean;
    animationDelayMs: number;
}, {
    items: ChecklistItem[];
    title?: string | undefined;
    showProgress?: boolean | undefined;
    animationDelayMs?: number | undefined;
}>;
export type ChecklistConfig = z.infer<typeof ChecklistConfigSchema>;
export declare const UpdateItemInputSchema: z.ZodObject<{
    itemId: z.ZodString;
    state: z.ZodEnum<["PENDING", "IN_PROGRESS", "COMPLETE", "SKIPPED", "FAILED"]>;
    detail: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    itemId: string;
    state: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "SKIPPED" | "FAILED";
    detail?: string | undefined;
    reason?: string | undefined;
}, {
    itemId: string;
    state: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "SKIPPED" | "FAILED";
    detail?: string | undefined;
    reason?: string | undefined;
}>;
export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>;
export declare const ChecklistErrorCode: z.ZodEnum<["ITEM_NOT_FOUND", "INVALID_STATE_TRANSITION", "RENDER_FAILED", "UNKNOWN_ERROR"]>;
export declare const RenderSuccess: z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodObject<{
        output: z.ZodString;
        completedCount: z.ZodNumber;
        totalCount: z.ZodNumber;
        percentComplete: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        output: string;
        completedCount: number;
        totalCount: number;
        percentComplete: number;
    }, {
        output: string;
        completedCount: number;
        totalCount: number;
        percentComplete: number;
    }>;
}, "strip", z.ZodTypeAny, {
    success: true;
    data: {
        output: string;
        completedCount: number;
        totalCount: number;
        percentComplete: number;
    };
}, {
    success: true;
    data: {
        output: string;
        completedCount: number;
        totalCount: number;
        percentComplete: number;
    };
}>;
export declare const RenderFailure: z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodObject<{
        code: z.ZodEnum<["ITEM_NOT_FOUND", "INVALID_STATE_TRANSITION", "RENDER_FAILED", "UNKNOWN_ERROR"]>;
        message: z.ZodString;
        recoverable: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        code: "UNKNOWN_ERROR" | "ITEM_NOT_FOUND" | "INVALID_STATE_TRANSITION" | "RENDER_FAILED";
        message: string;
        recoverable: boolean;
    }, {
        code: "UNKNOWN_ERROR" | "ITEM_NOT_FOUND" | "INVALID_STATE_TRANSITION" | "RENDER_FAILED";
        message: string;
        recoverable: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    success: false;
    error: {
        code: "UNKNOWN_ERROR" | "ITEM_NOT_FOUND" | "INVALID_STATE_TRANSITION" | "RENDER_FAILED";
        message: string;
        recoverable: boolean;
    };
}, {
    success: false;
    error: {
        code: "UNKNOWN_ERROR" | "ITEM_NOT_FOUND" | "INVALID_STATE_TRANSITION" | "RENDER_FAILED";
        message: string;
        recoverable: boolean;
    };
}>;
export type RenderResult = z.infer<typeof RenderSuccess> | z.infer<typeof RenderFailure>;
export declare const UpdateSuccess: z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodObject<{
        itemId: z.ZodString;
        previousState: z.ZodEnum<["PENDING", "IN_PROGRESS", "COMPLETE", "SKIPPED", "FAILED"]>;
        newState: z.ZodEnum<["PENDING", "IN_PROGRESS", "COMPLETE", "SKIPPED", "FAILED"]>;
    }, "strip", z.ZodTypeAny, {
        itemId: string;
        previousState: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "SKIPPED" | "FAILED";
        newState: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "SKIPPED" | "FAILED";
    }, {
        itemId: string;
        previousState: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "SKIPPED" | "FAILED";
        newState: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "SKIPPED" | "FAILED";
    }>;
}, "strip", z.ZodTypeAny, {
    success: true;
    data: {
        itemId: string;
        previousState: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "SKIPPED" | "FAILED";
        newState: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "SKIPPED" | "FAILED";
    };
}, {
    success: true;
    data: {
        itemId: string;
        previousState: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "SKIPPED" | "FAILED";
        newState: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "SKIPPED" | "FAILED";
    };
}>;
export declare const UpdateFailure: z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodObject<{
        code: z.ZodEnum<["ITEM_NOT_FOUND", "INVALID_STATE_TRANSITION", "RENDER_FAILED", "UNKNOWN_ERROR"]>;
        message: z.ZodString;
        recoverable: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        code: "UNKNOWN_ERROR" | "ITEM_NOT_FOUND" | "INVALID_STATE_TRANSITION" | "RENDER_FAILED";
        message: string;
        recoverable: boolean;
    }, {
        code: "UNKNOWN_ERROR" | "ITEM_NOT_FOUND" | "INVALID_STATE_TRANSITION" | "RENDER_FAILED";
        message: string;
        recoverable: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    success: false;
    error: {
        code: "UNKNOWN_ERROR" | "ITEM_NOT_FOUND" | "INVALID_STATE_TRANSITION" | "RENDER_FAILED";
        message: string;
        recoverable: boolean;
    };
}, {
    success: false;
    error: {
        code: "UNKNOWN_ERROR" | "ITEM_NOT_FOUND" | "INVALID_STATE_TRANSITION" | "RENDER_FAILED";
        message: string;
        recoverable: boolean;
    };
}>;
export type UpdateResult = z.infer<typeof UpdateSuccess> | z.infer<typeof UpdateFailure>;
export interface ChecklistUI {
    /** Initialize the checklist with items */
    initialize(config: ChecklistConfig): void;
    /** Update an item's state */
    updateItem(input: UpdateItemInput): UpdateResult;
    /** Render the current checklist state to a string */
    render(): RenderResult;
    /** Print the checklist to stdout (with optional in-place update) */
    print(options?: {
        clearPrevious?: boolean;
    }): void;
    /** Get current progress as percentage */
    getProgress(): {
        completed: number;
        total: number;
        percent: number;
    };
    /** Check if all items are complete or skipped */
    isComplete(): boolean;
}
