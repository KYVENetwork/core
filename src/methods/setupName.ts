import Prando from "prando";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";
import KyveCore from "..";

export function setupName(this: KyveCore): string {
  const r = new Prando(`${this.poolId}-${this.mnemonic}-${this.coreVersion}`);

  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    separator: "-",
    length: 3,
    style: "lowerCase",
    seed: r.nextInt(0, adjectives.length * colors.length * animals.length),
  }).replace(" ", "-");
}
