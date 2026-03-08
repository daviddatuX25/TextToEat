import { AssetGateway } from '../AssetGateway.js';
export declare class StitchViteServer {
    private server;
    private htmlMap;
    assetGateway: AssetGateway;
    constructor(projectRoot?: string, assetGateway?: AssetGateway);
    start(port?: number): Promise<string>;
    stop(): Promise<void>;
    mount(route: string, html: string): void;
    navigate(url: string): void;
}
