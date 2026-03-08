export interface StepResult {
    success: boolean;
    detail?: string;
    reason?: string;
    error?: Error;
    errorCode?: string;
    shouldExit?: boolean;
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'SKIPPED' | 'FAILED';
}
export interface CommandStep<T> {
    id: string;
    name: string;
    run(context: T): Promise<StepResult>;
    shouldRun(context: T): Promise<boolean>;
}
