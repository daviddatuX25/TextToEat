import { type InitCommand, type InitInput, type InitResult } from './spec.js';
import { type GcloudService } from '../../services/gcloud/spec.js';
import { type ProjectService } from '../../services/project/spec.js';
import { type StitchService } from '../../services/stitch/spec.js';
import { type McpConfigService } from '../../services/mcp-config/spec.js';
import { type UserInterface } from '../../framework/UserInterface.js';
export declare class InitHandler implements InitCommand {
    private readonly gcloudService;
    private readonly mcpConfigService;
    private readonly projectService;
    private readonly stitchService;
    private readonly ui;
    private checklist;
    private steps;
    constructor(gcloudService?: GcloudService, mcpConfigService?: McpConfigService, projectService?: ProjectService, stitchService?: StitchService, ui?: UserInterface);
    execute(input: InitInput): Promise<InitResult>;
    private updateStep;
    private printStepResult;
}
