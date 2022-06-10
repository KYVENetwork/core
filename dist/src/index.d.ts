import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Logger } from "tslog";
import { Item } from "./faces";
import { CLI } from "./utils";
import client from "prom-client";
import { Cache } from "./utils/cache";
import { KyveSDK, KyveWallet } from "@kyve/sdk";
export * from "./utils";
export * from "./faces";
export * from "./utils/helpers";
export * from "./utils/cache";
declare class KYVE {
    protected poolId: number;
    protected pool: any;
    protected runtime: string;
    protected version: string;
    protected stake: string;
    protected chainVersion: string;
    protected wallet: KyveWallet;
    protected sdk: KyveSDK;
    protected keyfile: JWKInterface;
    protected name: string;
    protected network: string;
    protected runMetrics: boolean;
    protected cache: Cache;
    protected logger: Logger;
    protected arweave: Arweave;
    static metrics: typeof client;
    constructor(cli?: CLI);
    start(): Promise<void>;
    private run;
    private cacheData;
    getDataItem(key: string): Promise<Item>;
    private resetCache;
    private loadBundle;
    private validateProposal;
    validate(localBundle: any[], localBytes: number, uploadBundle: any[], uploadBytes: number): Promise<boolean>;
    private downloadBundleFromArweave;
    private uploadBundleToArweave;
    private submitBundleProposal;
    private claimUploaderRole;
    private remainingUploadInterval;
    private nextBundleProposal;
    private vote;
    private setupMetrics;
    private getPool;
    private setupStake;
    private verifyNode;
    private generateRandomName;
}
export default KYVE;
