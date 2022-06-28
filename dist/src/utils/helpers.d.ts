/// <reference types="node" />
import { BigNumber } from "bignumber.js";
export declare const toBN: (amount: string) => BigNumber;
export declare const toHumanReadable: (amount: string, stringDecimals?: number) => string;
export declare const sleep: (ms: number) => Promise<unknown>;
export declare const toBytes: (input: string) => Buffer;
export declare const fromBytes: (input: string) => string;
export declare const dataSizeOfString: (string: string) => number;
export declare const dataSizeOfBinary: (binary: ArrayBuffer) => number;
export declare const callWithExponentialBackoff: (depth: number | undefined, fn: Function, args?: any[]) => Promise<any>;
export declare const callWithLinearBackoff: (duration: number | undefined, fn: Function, args?: any[]) => Promise<any>;
export declare const formatBundle: (input: Buffer[]) => Buffer;
export declare const parseBundle: (input: Buffer) => Buffer[];
