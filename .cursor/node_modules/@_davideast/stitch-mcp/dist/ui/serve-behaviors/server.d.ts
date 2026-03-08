export interface ServeInstance {
    url: string;
    stop: () => void;
}
export declare function serveHtmlInMemory(html: string, options?: {
    timeout?: number;
    openBrowser?: boolean;
}): Promise<ServeInstance>;
