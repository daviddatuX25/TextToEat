import { clsx } from 'clsx';
import { useInView } from '../../hooks/useInView';

const variantClasses = {
    fadeUp: 'scroll-in',
    slideLeft: 'scroll-in-left',
    slideRight: 'scroll-in-right',
};

/**
 * Wraps content and animates it when it scrolls into view (Intersection Observer).
 * @param {Object} props
 * @param {keyof JSX.IntrinsicElements} [props.as='div'] - Render as this element (e.g. 'section').
 * @param {'fadeUp'|'slideLeft'|'slideRight'} [props.variant='fadeUp']
 * @param {number} [props.staggerIndex] - Optional delay index when used inside a scroll-stagger-container (sets --stagger-index).
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export function AnimateOnScroll({ as: Component = 'div', variant = 'fadeUp', staggerIndex, className, children, ...rest }) {
    const [ref, isInView] = useInView({ threshold: 0.1, rootMargin: '0px 0px -5% 0px', triggerOnce: true });

    const baseClass = variantClasses[variant] ?? variantClasses.fadeUp;

    return (
        <Component
            ref={ref}
            className={clsx(baseClass, isInView && 'is-visible', className)}
            style={staggerIndex != null ? { '--stagger-index': staggerIndex } : undefined}
            data-visible={isInView}
            {...rest}
        >
            {children}
        </Component>
    );
}

/**
 * Container for staggered children: when this enters view, children with .scroll-in animate in with delay.
 * Use with AnimateOnScroll (variant fadeUp) as direct children, or add scroll-in + --stagger-index to children.
 * @param {Object} props
 * @param {keyof JSX.IntrinsicElements} [props.as='div'] - Render as this element (e.g. 'section').
 */
export function StaggerScrollIn({ as: Component = 'div', className, children, ...rest }) {
    const [ref, isInView] = useInView({ threshold: 0.1, rootMargin: '0px 0px -5% 0px', triggerOnce: true });

    return (
        <Component
            ref={ref}
            className={clsx('scroll-stagger-container', isInView && 'is-visible', className)}
            data-visible={isInView}
            {...rest}
        >
            {children}
        </Component>
    );
}
