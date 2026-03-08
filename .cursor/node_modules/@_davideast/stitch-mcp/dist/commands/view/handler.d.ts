interface ViewOptions {
    projects: boolean;
    name?: string;
    sourceScreen?: string;
    project?: string;
    screen?: string;
    serve: boolean;
}
export declare class ViewCommandHandler {
    execute(options: ViewOptions): Promise<void>;
    private executeServeMode;
    private executeInteractiveMode;
}
export {};
