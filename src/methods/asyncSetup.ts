import { Node } from "..";

export async function asyncSetup(this: Node): Promise<void> {
  this.client = await this.sdk.fromMnemonic(this.mnemonic);
}
