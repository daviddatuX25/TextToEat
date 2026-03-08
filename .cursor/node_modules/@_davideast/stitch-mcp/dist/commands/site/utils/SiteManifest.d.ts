interface ScreenState {
    status?: 'included' | 'ignored' | 'discarded';
    route?: string;
}
export declare class SiteManifest {
    private filePath;
    private legacyPath;
    constructor(projectId: string);
    load(): Promise<Map<string, ScreenState>>;
    save(screens: {
        id: string;
        status: string;
        route: string;
    }[]): Promise<void>;
}
export {};
