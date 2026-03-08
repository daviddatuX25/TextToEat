import { type LogoutInput } from './spec.js';
import { type UserInterface } from '../../framework/UserInterface.js';
import { type GcloudService } from '../../services/gcloud/spec.js';
export interface LogoutContext {
    input: LogoutInput;
    ui: UserInterface;
    gcloudService: GcloudService;
    gcloudPath?: string;
    userRevoked: boolean;
    adcRevoked: boolean;
    configCleared: boolean;
}
