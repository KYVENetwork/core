export interface Signature {
    address: string;
    signature: string;
    pubKey: string;
    poolId: string;
    timestamp: string;
}
export interface DataItem {
    key: string;
    value: any;
}
export interface Bundle {
    bundle: DataItem[];
    toKey: string;
    toValue: string;
}
