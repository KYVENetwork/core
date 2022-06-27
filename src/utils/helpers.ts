import base64url from "base64url";
import { BigNumber } from "bignumber.js";
import Prando from "prando";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";

export const toBN = (amount: string) => {
  return new BigNumber(amount);
};

export const toHumanReadable = (amount: string, stringDecimals = 4): string => {
  const fmt = new BigNumber(amount || "0")
    .div(10 ** 9)
    .toFixed(stringDecimals, 1);

  if (stringDecimals > 1) {
    return `${fmt.split(".")[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${
      fmt.split(".")[1]
    }`;
  }

  return fmt.split(".")[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const toBytes = (input: string): Buffer => {
  return Buffer.from(base64url.decode(input, "hex"), "hex");
};

export const fromBytes = (input: string): string => {
  return base64url.encode(input.slice(2), "hex");
};

export const dataSizeOfString = (string: string): number => {
  return new Uint8Array(new TextEncoder().encode(string)).byteLength || 0;
};

export const dataSizeOfBinary = (binary: ArrayBuffer): number => {
  return new Uint8Array(binary).byteLength || 0;
};

export const generateName = (
  poolId: number,
  mnemonic: string,
  version: string
) => {
  const r = new Prando(`${poolId}${mnemonic}${version}`);

  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    separator: "-",
    length: 3,
    style: "lowerCase",
    seed: r.nextInt(0, adjectives.length * colors.length * animals.length),
  }).replace(" ", "-");
};

export const callWithExponentialBackoff = async (
  depth = 0,
  fn: Function,
  args: any[] = []
): Promise<any> => {
  try {
    return await fn(...args);
  } catch (err) {
    console.log(err);
    await sleep(2 ** depth * 10);
    return depth > 12
      ? await callWithExponentialBackoff(depth, fn, args)
      : await callWithExponentialBackoff(depth + 1, fn, args);
  }
};

export const callWithLinearBackoff = async (
  duration = 1000,
  fn: Function,
  args: any[] = []
): Promise<any> => {
  try {
    return await fn(...args);
  } catch {
    await sleep(duration);
    return await callWithLinearBackoff(duration, fn, args);
  }
};

// Inspired by https://github.com/Bundlr-Network/arbundles/blob/f3e8e1df09e68e33f3a51af33127999566ab3e37/src/utils.ts#L41-L85.
const longTo32ByteArray = (long: number): Uint8Array => {
  const byteArray = Buffer.alloc(32, 0);

  for (let index = 0; index < byteArray.length; index++) {
    const byte = long & 0xff;
    byteArray[index] = byte;
    long = (long - byte) / 256;
  }

  return Uint8Array.from(byteArray);
};

// Inspired by https://github.com/Bundlr-Network/arbundles/blob/f3e8e1df09e68e33f3a51af33127999566ab3e37/src/utils.ts#L87-L93.
const byteArrayToLong = (byteArray: Uint8Array): number => {
  let value = 0;
  for (let i = byteArray.length - 1; i >= 0; i--) {
    value = value * 256 + byteArray[i];
  }
  return value;
};

// Inspired by https://github.com/Bundlr-Network/arbundles/blob/1976030eba3953dcd7582e65b50217f893f6248d/src/ar-data-bundle.ts#L25-L64.
export const formatBundle = (input: Buffer[]): Buffer => {
  const offsets = new Uint8Array(32 * input.length);
  input.forEach((item, index) => {
    offsets.set(longTo32ByteArray(item.byteLength), 32 * index);
  });

  return Buffer.concat([
    longTo32ByteArray(input.length),
    offsets,
    Buffer.concat(input),
  ]);
};

// Inspired by https://github.com/Bundlr-Network/arbundles/blob/8a1509bc9596467d2f05003039da7e4de4d02ce3/src/Bundle.ts#L174-L199.
export const parseBundle = (input: Buffer): Buffer[] => {
  const count = byteArrayToLong(input.slice(0, 32));
  const itemStart = 32 + 32 * count;
  let offset = 0;

  const result: Buffer[] = [];
  for (let i = 32; i < itemStart; i += 32) {
    const _offset = byteArrayToLong(input.slice(i, i + 32));
    result.push(input.slice(itemStart + offset, itemStart + offset + _offset));

    offset += _offset;
  }

  return result;
};
