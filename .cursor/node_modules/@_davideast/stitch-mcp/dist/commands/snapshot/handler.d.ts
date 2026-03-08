import { type SnapshotCommand, type SnapshotInput, type SnapshotResult } from './spec.js';
import { type GcloudService } from '../../services/gcloud/spec.js';
import { type StitchService } from '../../services/stitch/spec.js';
import { type McpConfigService } from '../../services/mcp-config/spec.js';
import { type ProjectService } from '../../services/project/spec.js';
interface SnapshotServices {
    gcloud?: GcloudService;
    stitch?: StitchService;
    mcpConfig?: McpConfigService;
    project?: ProjectService;
}
export declare class SnapshotHandler implements SnapshotCommand {
    private readonly services?;
    constructor(services?: SnapshotServices | undefined);
    execute(input: SnapshotInput): Promise<SnapshotResult>;
}
export {};
