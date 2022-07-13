"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Arweave = void 0;
const arweave_1 = __importDefault(require("arweave"));
const axios_1 = __importDefault(require("axios"));
const fs_1 = require("fs");
class Arweave {
    constructor() {
        this.name = "Arweave";
        this.arweaveClient = new arweave_1.default({
            host: "arweave.net",
            protocol: "https",
        });
    }
    init(wallet) {
        this.wallet = JSON.parse((0, fs_1.readFileSync)(wallet, "utf-8"));
        return this;
    }
    async saveBundle(bundle, tags) {
        const transaction = await this.arweaveClient.createTransaction({
            data: bundle,
        });
        for (let tag of tags) {
            transaction.addTag(...tag);
        }
        await this.arweaveClient.transactions.sign(transaction, this.wallet);
        const balance = await this.arweaveClient.wallets.getBalance(await this.arweaveClient.wallets.getAddress(this.wallet));
        if (+transaction.reward > +balance) {
            throw Error(`Not enough funds in Arweave wallet. Found = ${balance} required = ${transaction.reward}`);
        }
        await this.arweaveClient.transactions.post(transaction);
        return transaction.id;
    }
    async retrieveBundle(storageId) {
        const { status } = await this.arweaveClient.transactions.getStatus(storageId);
        if (status !== 200 && status !== 202) {
            throw Error(`Could not download bundle from Arweave. Status code = ${status}`);
        }
        const { data: bundle } = await axios_1.default.get(`https://arweave.net/${storageId}`, { responseType: "arraybuffer" });
        return bundle;
    }
}
exports.Arweave = Arweave;
