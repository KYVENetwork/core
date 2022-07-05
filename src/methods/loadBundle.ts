import { Node } from "..";
import { Bundle } from "../types";

export async function loadBundle(
  this: Node,
  fromHeight: number,
  toHeight: number
): Promise<Bundle> {
  const bundle: any[] = [];

  for (let height = fromHeight; height < toHeight; height++) {
    try {
      bundle.push(await this.cache.get(height.toString()));
    } catch {
      break;
    }
  }

  let toKey = "";
  let toValue = "";

  if (bundle.length) {
    const latestItem = bundle[bundle.length - 1];

    toKey = latestItem.key;
    toValue = await this.runtime.formatValue(latestItem.value);
  }

  return {
    bundle,
    toKey,
    toValue,
  };
}
