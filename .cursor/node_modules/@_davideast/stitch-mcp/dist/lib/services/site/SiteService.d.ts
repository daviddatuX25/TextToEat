import type { RemoteScreen, SiteConfig, IAssetGateway, UIScreen } from './types.js';
export declare class SiteService {
    static toUIScreens(screens: RemoteScreen[]): UIScreen[];
    static generateSite(config: SiteConfig, htmlContent: Map<string, string>, assetGateway: IAssetGateway, outputDir?: string): Promise<void>;
    static slugify(text: string): string;
}
