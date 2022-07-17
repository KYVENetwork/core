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
export declare function callWithBackoffStrategy<T>(execution: () => Promise<T>, option: OptionsRetryerType, onEachError?: onEachErrorRetryerType): Promise<T>;
export declare const toBytes: (input: string) => Buffer;
export declare const fromBytes: (input: string) => string;
export declare const standardizeJSON: (object: any) => any;
export declare const sha256: (object: any) => string;
export {};
