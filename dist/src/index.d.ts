import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Contract, Wallet } from "ethers";
import { BlockInstructions } from "./faces";
import { CLI } from "./utils";
import client from "prom-client";
export * from "./utils";
declare class KYVE {
    protected pool: Contract;
    protected runtime: string;
    protected version: string;
    protected stake: string;
    protected commission: string;
    protected wallet: Wallet;
    protected keyfile?: JWKInterface;
    protected name: string;
    protected gasMultiplier: string;
    protected poolState: any;
    protected runMetrics: boolean;
    protected db: any;
    protected arweave: Arweave;
    static metrics: typeof client;
    static logger: import("tslog").Logger;
    static dataSizeOfString: (string: string) => number;
    constructor(cli?: CLI);
    start(): Promise<void>;
    private run;
    worker(): Promise<void>;
    createBundle(blockInstructions: BlockInstructions): Promise<any[]>;
    validate(uploadBundle: any[], uploadBytes: number, downloadBundle: any[], downloadBytes: number): Promise<boolean>;
    private getBlockProposal;
    private getBlockInstructions;
    private uploadBundleToArweave;
    private submitBlockProposal;
    private waitForNextBlockInstructions;
    private vote;
    private logNodeInfo;
    private setupMetrics;
    private fetchPoolState;
    private setupDB;
    private checkIfNodeIsValidator;
    private setupNodeStake;
    private selfStake;
    private selfUnstake;
    private setupNodeCommission;
    private calculateUploaderWaitingTime;
}
export default KYVE;
