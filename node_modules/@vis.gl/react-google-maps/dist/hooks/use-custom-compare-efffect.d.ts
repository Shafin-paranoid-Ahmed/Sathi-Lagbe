import { DependencyList, EffectCallback } from 'react';
export declare function useCustomCompareEffect<T extends DependencyList>(effect: EffectCallback, dependencies: T, isEqual: (a: T, b: T) => boolean): void;
