import { type DoctorCommand, type DoctorInput, type DoctorResult } from './spec.js';
import { type GcloudService } from '../../services/gcloud/spec.js';
import { type StitchService } from '../../services/stitch/spec.js';
import { type UserInterface } from '../../framework/UserInterface.js';
export declare class DoctorHandler implements DoctorCommand {
    private readonly gcloudService;
    private readonly stitchService;
    private steps;
    private readonly ui;
    constructor(gcloudService?: GcloudService, stitchService?: StitchService, ui?: UserInterface);
    execute(input: DoctorInput): Promise<DoctorResult>;
}
