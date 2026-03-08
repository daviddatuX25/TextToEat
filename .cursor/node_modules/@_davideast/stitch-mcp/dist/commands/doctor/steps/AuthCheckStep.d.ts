import { type CommandStep, type StepResult } from '../../../framework/CommandStep.js';
import { type DoctorContext } from '../context.js';
export declare class AuthCheckStep implements CommandStep<DoctorContext> {
    id: string;
    name: string;
    shouldRun(context: DoctorContext): Promise<boolean>;
    run(context: DoctorContext): Promise<StepResult>;
}
