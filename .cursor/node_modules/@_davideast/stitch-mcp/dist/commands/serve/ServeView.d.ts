interface CodeScreen {
    screenId: string;
    title: string;
    codeUrl: string;
}
interface ServeViewProps {
    projectId: string;
    projectTitle: string;
    screens: CodeScreen[];
}
export declare function ServeView({ projectId, projectTitle, screens }: ServeViewProps): import("react/jsx-runtime").JSX.Element;
export {};
