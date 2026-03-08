import React from 'react';
import type { UIScreen } from './types.js';
interface ScreenListProps {
    items: {
        screen: UIScreen;
        sourceIndex: number;
    }[];
    activeIndex: number;
}
export declare const ScreenList: React.FC<ScreenListProps>;
export {};
