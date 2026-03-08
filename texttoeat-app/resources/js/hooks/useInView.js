import { useCallback, useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {{
 *   threshold?: number;
 *   rootMargin?: string;
 *   triggerOnce?: boolean;
 * }} [options]
 * @returns {[React.RefObject<Element | null>, boolean]}
 */
export function useInView(options = {}) {
    const {
        threshold = 0.1,
        rootMargin = '0px 0px -5% 0px',
        triggerOnce = true,
    } = options;

    const ref = useRef(null);
    const [isInView, setIsInView] = useState(false);

    const setVisible = useCallback(() => setIsInView(true), []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        if (prefersReducedMotion()) {
            setIsInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (!entry?.isIntersecting) return;
                setVisible();
                if (triggerOnce && ref.current) {
                    observer.unobserve(ref.current);
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold, rootMargin, triggerOnce, setVisible]);

    return [ref, isInView];
}
