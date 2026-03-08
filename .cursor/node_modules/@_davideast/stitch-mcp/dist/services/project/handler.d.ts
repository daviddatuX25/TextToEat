import { type ProjectService, type SelectProjectInput, type ProjectSelectionResult } from './spec.js';
import { type GcloudService } from '../gcloud/spec.js';
export declare class ProjectHandler implements ProjectService {
    private gcloudService;
    constructor(gcloudService: GcloudService);
    selectProject(input: SelectProjectInput): Promise<ProjectSelectionResult>;
    getProjectDetails(input: {
        projectId: string;
    }): Promise<ProjectSelectionResult>;
    private searchAndSelect;
}
