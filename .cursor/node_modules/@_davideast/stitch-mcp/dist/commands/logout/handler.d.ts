import { type LogoutCommand, type LogoutInput, type LogoutResult } from './spec.js';
import { type GcloudService } from '../../services/gcloud/spec.js';
export declare class LogoutHandler implements LogoutCommand {
    private readonly gcloudService;
    private steps;
    constructor(gcloudService?: GcloudService);
    execute(input: LogoutInput): Promise<LogoutResult>;
}
