import { Cache } from ".";
export default class JsonFileCache extends Cache {
    put(key: string | number, value: any): Promise<void>;
    get(key: string | number): Promise<any>;
    del(key: string | number): Promise<void>;
    drop(): Promise<void>;
    exists(key: string | number): Promise<boolean>;
}