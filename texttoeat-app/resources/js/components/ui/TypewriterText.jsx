import { useState, useEffect, useCallback } from 'react';

/**
 * Types out text character by character with random speed, then resets and repeats.
 * Uses a subtle cursor blink at the end.
 */
export function TypewriterText({ text, className = '', minDelay = 25, maxDelay = 75, pauseMs = 2500 }) {
    const [display, setDisplay] = useState('');
    const [index, setIndex] = useState(0);
    const [phase, setPhase] = useState('typing'); // 'typing' | 'pause' | 'reset'

    const runTyping = useCallback(() => {
        if (phase !== 'typing' || !text) return;
        if (index >= text.length) {
            setPhase('pause');
            return;
        }
        const delay = minDelay + Math.random() * (maxDelay - minDelay);
        const t = setTimeout(() => {
            setDisplay((d) => d + text[index]);
            setIndex((i) => i + 1);
        }, delay);
        return () => clearTimeout(t);
    }, [text, index, phase, minDelay, maxDelay]);

    const runPause = useCallback(() => {
        if (phase !== 'pause') return;
        const t = setTimeout(() => setPhase('reset'), pauseMs);
        return () => clearTimeout(t);
    }, [phase, pauseMs]);

    const runReset = useCallback(() => {
        if (phase !== 'reset') return;
        setDisplay('');
        setIndex(0);
        setPhase('typing');
    }, [phase]);

    useEffect(() => {
        if (!text) return;
        if (phase === 'typing') return runTyping();
        if (phase === 'pause') return runPause();
        if (phase === 'reset') runReset();
    }, [text, phase, runTyping, runPause, runReset]);

    // Reset when text prop changes
    useEffect(() => {
        setDisplay('');
        setIndex(0);
        setPhase('typing');
    }, [text]);

    if (!text) return null;

    return (
        <span className={className} aria-live="polite" aria-atomic="true">
            {display}
            {phase === 'typing' || phase === 'pause' ? (
                <span
                    className="inline-block w-0.5 h-[1em] ml-0.5 align-baseline bg-current animate-[cursorBlink_1s_steps(2)_infinite]"
                    aria-hidden="true"
                />
            ) : null}
        </span>
    );
}
