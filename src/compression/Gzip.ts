import { gunzipSync, gzipSync } from "zlib";
import { DataItem, ICompression } from "../types";

export class Gzip implements ICompression {
  public name = "Gzip";

  async compress(bundle: DataItem[]) {
    return gzipSync(Buffer.from(JSON.stringify(bundle)));
  }

  async decompress(data: Buffer) {
    return JSON.parse(gunzipSync(data).toString());
  }
}
