import { Node } from "..";
export declare function submitBundleProposal(this: Node, storageId: string, byteSize: number, fromHeight: number, toHeight: number, fromKey: string, toKey: string, toValue: string, bundleHash: string): Promise<boolean>;
