import { ICache } from "../types";
export declare class JsonFileCache implements ICache {
    name: string;
    path: string;
    init(path: string): this;
    put(key: string | number, value: any): Promise<void>;
    get(key: string | number): Promise<any>;
    del(key: string | number): Promise<void>;
    drop(): Promise<void>;
    exists(key: string | number): Promise<boolean>;
}
