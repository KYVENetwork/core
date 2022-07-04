/// <reference types="node" />
import { DataItem, ICompression } from "../types";
export declare class Gzip implements ICompression {
    name: string;
    compress(bundle: DataItem[]): Promise<Buffer>;
    decompress(data: Buffer): Promise<any>;
}
