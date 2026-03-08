import { type CommandStep, type StepResult } from '../../../framework/CommandStep.js';
import { type LogoutContext } from '../context.js';
export declare class ClearConfigStep implements CommandStep<LogoutContext> {
    id: string;
    name: string;
    shouldRun(context: LogoutContext): Promise<boolean>;
    run(context: LogoutContext): Promise<StepResult>;
}
