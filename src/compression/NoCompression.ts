import { DataItem, ICompression } from "../types";

export class NoCompression implements ICompression {
  public name = "NoCompression";

  async compress(bundle: DataItem[]) {
    return Buffer.from(JSON.stringify(bundle));
  }

  async decompress(data: Buffer) {
    return JSON.parse(data.toString());
  }
}
