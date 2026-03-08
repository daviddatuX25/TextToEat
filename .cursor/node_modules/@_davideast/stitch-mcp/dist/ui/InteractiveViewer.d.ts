export interface ViewerState {
    data: any;
    rootLabel?: string;
    resourcePath?: string;
}
interface InteractiveViewerProps {
    initialData: any;
    initialRootLabel?: string;
    /** Pre-populated navigation history (for back navigation from deep links) */
    initialHistory?: ViewerState[];
    /** Fetch function to load new resource data */
    onFetch: (resourceName: string) => Promise<any>;
    /** Called when exiting the viewer */
    onExit?: () => void;
}
export declare const InteractiveViewer: ({ initialData, initialRootLabel, initialHistory, onFetch, onExit, }: InteractiveViewerProps) => import("react/jsx-runtime").JSX.Element;
export {};
