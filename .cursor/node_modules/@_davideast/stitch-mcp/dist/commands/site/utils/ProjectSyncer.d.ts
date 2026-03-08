import { StitchMCPClient } from '../../../services/mcp-client/client.js';
import type { RemoteScreen } from '../../../lib/services/site/types.js';
export declare class ProjectSyncer {
    private client;
    constructor(client: StitchMCPClient);
    fetchManifest(projectId: string): Promise<RemoteScreen[]>;
    fetchContent(url: string): Promise<string>;
}
