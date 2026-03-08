import { type DoctorInput } from './spec.js';
import { type UserInterface } from '../../framework/UserInterface.js';
import { type GcloudService } from '../../services/gcloud/spec.js';
import { type StitchService } from '../../services/stitch/spec.js';
export interface DoctorContext {
    input: DoctorInput;
    ui: UserInterface;
    gcloudService: GcloudService;
    stitchService: StitchService;
    authMode: 'apiKey' | 'oauth';
    apiKey?: string;
    checks: Array<{
        name: string;
        passed: boolean;
        message: string;
        suggestion?: string;
        details?: string;
    }>;
}
