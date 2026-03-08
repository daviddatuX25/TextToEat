import type { CommandStep, StepResult } from '../../../framework/CommandStep.js';
import type { ToolContext } from '../context.js';
export declare class ParseArgsStep implements CommandStep<ToolContext> {
    id: string;
    name: string;
    shouldRun(context: ToolContext): Promise<boolean>;
    run(context: ToolContext): Promise<StepResult>;
}
