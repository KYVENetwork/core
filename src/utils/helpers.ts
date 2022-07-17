import base64url from "base64url";
import { BigNumber } from "bignumber.js";
import crypto from "crypto";

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
/**
 * @param timeout number in milliseconds or string e.g (1m, 3h, 20s)
 */
export const sleep = (timeout: number | string) => {
  const timeoutMs =
    typeof timeout === "string" ? humanInterval(timeout) : timeout;
  return new Promise((resolve) => setTimeout(resolve, timeoutMs));
};

function humanInterval(str: string): number {
  const multiplier = {
    ms: 1,
    s: 1000,
    m: 1000 * 60,
    h: 1000 * 60 * 60,
    d: 1000 * 60 * 60 * 24,
    w: 1000 * 60 * 60 * 24 * 7,
  } as const;
  const intervalRegex = /^(\d+)(ms|[smhdw])$/;

  const errorConvert = new Error(`Can't convert ${str} to interval`);
  if (!str || typeof str !== "string" || str.length < 2) throw errorConvert;

  const matched = intervalRegex.exec(str.trim().toLowerCase());

  // must be positive number
  if (matched && matched.length > 1 && parseInt(matched[1]) > 0) {
    const key = matched[2] as keyof typeof multiplier;
    return parseInt(matched[1]) * multiplier[key];
  }

  throw errorConvert;
}

type OptionsRetryerType = {
  limitTimeout: string | number;
  increaseBy: string | number;
  maxRequests?: number;
};

type onEachErrorRetryerType = (
  value: Error,
  ctx: {
    nextTimeoutInMs: number;
    numberOfRetries: number;
    option: OptionsRetryerType;
  }
) => void;

export async function callWithBackoffStrategy<T>(
  execution: () => Promise<T>,
  option: OptionsRetryerType,
  onEachError?: onEachErrorRetryerType
): Promise<T> {
  const limitTimeout =
    typeof option.limitTimeout === "string"
      ? humanInterval(option.limitTimeout)
      : option.limitTimeout;

  const increaseBy =
    typeof option.increaseBy === "string"
      ? humanInterval(option.increaseBy)
      : option.increaseBy;

  let time = increaseBy;
  let requests = 1;
  return new Promise(async (resolve) => {
    while (true) {
      try {
        const result = await execution();
        return resolve(result);
      } catch (e) {
        if (onEachError) {
          await onEachError(e as Error, {
            nextTimeoutInMs: time,
            numberOfRetries: requests,
            option,
          });
        }
        await sleep(time);
        if (time < limitTimeout) {
          time += increaseBy;
          if (time > limitTimeout) time = limitTimeout;
        }
        if (option.maxRequests && requests >= option.maxRequests) {
          throw e;
        }
        requests++;
      }
    }
  });
}

export const toBytes = (input: string): Buffer => {
  return Buffer.from(base64url.decode(input, "hex"), "hex");
};

export const fromBytes = (input: string): string => {
  return base64url.encode(input.slice(2), "hex");
};

export const standardizeJSON = (object: any) =>
  JSON.parse(JSON.stringify(object));

export const sha256 = (object: any) => {
  const sha256Hasher = crypto.createHmac("sha256", "");
  return sha256Hasher.update(JSON.stringify(object)).digest("hex");
};
