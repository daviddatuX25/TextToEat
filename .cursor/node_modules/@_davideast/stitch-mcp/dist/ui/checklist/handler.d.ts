import type { ChecklistUI, ChecklistConfig, UpdateItemInput, UpdateResult, RenderResult } from './spec.js';
export declare class ChecklistUIHandler implements ChecklistUI {
    private config;
    private states;
    private lastOutputLines;
    initialize(config: ChecklistConfig): void;
    updateItem(input: UpdateItemInput): UpdateResult;
    render(): RenderResult;
    print(options?: {
        clearPrevious?: boolean;
    }): void;
    getProgress(): {
        completed: number;
        total: number;
        percent: number;
    };
    isComplete(): boolean;
    private getStateColor;
}
/**
 * Create a new ChecklistUI instance
 */
export declare function createChecklistUI(): ChecklistUI;
