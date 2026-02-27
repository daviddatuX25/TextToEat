export function SectionHeading({ className, as: Component = 'h2', ...props }) {
    return (
        <Component
            className={`section-heading ${className ?? ''}`.trim()}
            {...props}
        />
    );
}
