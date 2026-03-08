import { type CommandStep, type StepResult } from '../../../framework/CommandStep.js';
import { type InitContext } from '../context.js';
export declare class ProjectSelectStep implements CommandStep<InitContext> {
    id: string;
    name: string;
    shouldRun(context: InitContext): Promise<boolean>;
    run(context: InitContext): Promise<StepResult>;
}
