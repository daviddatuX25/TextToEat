/**
 * Wrapper for ora spinner with consistent styling
 */
export declare class Spinner {
    private spinner;
    start(message: string): void;
    succeed(message: string): void;
    fail(message: string): void;
    stop(): void;
}
export declare function createSpinner(): Spinner;
