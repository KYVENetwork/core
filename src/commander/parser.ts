import BigNumber from "bignumber.js";
import commander from "commander";
import { existsSync } from "fs";

export const parsePoolId = (value: string): number => {
  const parsedValue = parseInt(value);

  if (isNaN(parsedValue)) {
    throw new commander.InvalidArgumentError("PoolId must be of type number.");
  }
  return parsedValue;
};

export const parseMnemonic = (value: string): string => {
  const parsedValue = value.split(" ");

  if (!(parsedValue.length === 12 || parsedValue.length === 24)) {
    throw new commander.InvalidArgumentError(
      "Mnemonic must have 12 or 24 words."
    );
  }
  return value;
};

export const parseKeyfile = (value: string): string => {
  if (!existsSync(value)) {
    throw new commander.InvalidArgumentError(
      `Keyfile does not exist in path ${value}.`
    );
  }

  return value;
};

export const parseDesiredStake = (value: string): string => {
  const parsedValue = new BigNumber(value);

  if (parsedValue.toString() === "NaN") {
    throw new commander.InvalidArgumentError(
      "Desired stake must be of type number."
    );
  }

  return value;
};

export const parseNetwork = (value: string): string => {
  if (!["local", "alpha", "beta", "korellia"].includes(value)) {
    throw new commander.InvalidArgumentError(
      "Network must be either 'local', 'alpha', 'beta' or 'korellia'."
    );
  }

  return value;
};
