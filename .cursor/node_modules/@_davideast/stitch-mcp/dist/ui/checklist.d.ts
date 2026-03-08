/**
 * Result of a verification check
 */
export interface VerifyResult {
    success: boolean;
    message?: string;
}
/**
 * A single step in the checklist
 */
export interface ChecklistStep {
    id: string;
    title: string;
    command: string;
    instruction?: string;
    verifyCommand?: string[];
    verifyFn?: () => Promise<VerifyResult>;
    env?: Record<string, string>;
}
/**
 * Options for running the checklist
 */
export interface ChecklistOptions {
    autoVerify: boolean;
    startingStepNumber?: number;
}
/**
 * Result of running the checklist
 */
export interface ChecklistResult {
    success: boolean;
    completedSteps: string[];
    failedStep?: string;
    error?: string;
}
/**
 * Verify all steps upfront to determine which can be skipped
 */
export declare function verifyAllSteps(steps: ChecklistStep[], env?: Record<string, string>): Promise<Map<string, VerifyResult>>;
/**
 * Checklist runner - guides user through steps
 */
export declare class Checklist {
    private completedSteps;
    private env;
    /**
     * Run the checklist
     */
    run(steps: ChecklistStep[], options: ChecklistOptions): Promise<ChecklistResult>;
}
/**
 * Create a new checklist runner
 */
export declare function createChecklist(): Checklist;
