import { type Plugin } from 'vite';
import { AssetGateway } from '../../AssetGateway.js';
export interface VirtualContentOptions {
    assetGateway: AssetGateway;
    htmlMap: Map<string, string>;
}
export declare function virtualContent({ assetGateway, htmlMap }: VirtualContentOptions): Plugin;
