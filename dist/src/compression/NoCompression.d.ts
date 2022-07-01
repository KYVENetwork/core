/// <reference types="node" />
import { DataItem, ICompression } from "../types";
export default class NoCompression implements ICompression {
    name: string;
    compress(bundle: DataItem[]): Promise<Buffer>;
    decompress(data: Buffer): Promise<any>;
}
