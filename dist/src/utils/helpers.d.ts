/// <reference types="node" />
import { BigNumber } from "bignumber.js";
export declare const toBN: (amount: string) => BigNumber;
export declare const toHumanReadable: (amount: string, stringDecimals?: number) => string;
/**
 * @param timeout number in milliseconds or string e.g (1m, 3h, 20s)
 */
export declare const sleep: (timeout: number | string) => Promise<unknown>;
declare type OptionsRetryerType = {
    limitTimeout: string | number;
    increaseBy: string | number;
    maxRequests?: number;
};
declare type onEachErrorRetryerType = (value: Error, ctx: {
    nextTimeoutInMs: number;
    numberOfRetries: number;
    option: OptionsRetryerType;
}) => void;
export declare function retryer<T>(execution: () => Promise<T>, option: OptionsRetryerType, onEachError?: onEachErrorRetryerType): Promise<T>;
export declare const toBytes: (input: string) => Buffer;
export declare const fromBytes: (input: string) => string;
export declare const dataSizeOfString: (string: string) => number;
export declare const dataSizeOfBinary: (binary: ArrayBuffer) => number;
export declare const callWithExponentialBackoff: (depth: number | undefined, fn: Function, args?: any[]) => Promise<any>;
export declare const callWithLinearBackoff: (duration: number | undefined, fn: Function, args?: any[]) => Promise<any>;
export declare const formatBundle: (input: Buffer[]) => Buffer;
export declare const parseBundle: (input: Buffer) => Buffer[];
export {};
