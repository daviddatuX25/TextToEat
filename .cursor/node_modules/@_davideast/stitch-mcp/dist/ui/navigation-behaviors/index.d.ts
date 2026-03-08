/**
 * Navigation behaviors for the JSON viewer.
 * Handles drill-down navigation into screens and back navigation.
 */
export interface NavigationContext {
    /** Current selected path */
    path: string;
    /** Current node value */
    value: any;
    /** The key of the node */
    key: string;
}
export interface NavigationResult {
    /** Whether navigation should occur */
    shouldNavigate: boolean;
    /** Target resource to navigate to */
    target?: string;
    /** Type of navigation (e.g., 'screen', 'project') */
    type?: string;
}
export type NavigationHandler = (ctx: NavigationContext) => NavigationResult;
/**
 * Detects if the current node is within screenInstances and can navigate to a screen.
 * When on screenInstances[x] or screenInstances[x].sourceScreen, extract the sourceScreen value.
 */
export declare function screenInstanceNavigationHandler(ctx: NavigationContext): NavigationResult;
/**
 * Get navigation result for a given context.
 */
export declare function getNavigationTarget(ctx: NavigationContext): NavigationResult;
/**
 * Register a custom navigation handler.
 */
export declare function registerNavigationHandler(handler: NavigationHandler): void;
