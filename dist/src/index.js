"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const arweave_1 = __importDefault(require("arweave"));
const fs_1 = require("fs");
const prando_1 = __importDefault(require("prando"));
const tslog_1 = require("tslog");
const utils_1 = require("./utils");
const helpers_1 = require("./utils/helpers");
const package_json_1 = require("../package.json");
const object_hash_1 = __importDefault(require("object-hash"));
const http_1 = __importDefault(require("http"));
const url_1 = __importDefault(require("url"));
const prom_client_1 = __importStar(require("prom-client"));
const cache_1 = require("./utils/cache");
const zlib_1 = require("zlib");
const axios_1 = __importDefault(require("axios"));
const unique_names_generator_1 = require("unique-names-generator");
const sdk_1 = require("@kyve/sdk");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const constants_1 = require("./utils/constants");
__exportStar(require("./utils"), exports);
__exportStar(require("./faces"), exports);
__exportStar(require("./utils/helpers"), exports);
__exportStar(require("./utils/cache"), exports);
prom_client_1.default.collectDefaultMetrics({
    labels: { app: "kyve-core" },
});
class KYVE {
    constructor(cli) {
        this.arweave = new arweave_1.default({
            host: "arweave.net",
            protocol: "https",
        });
        if (!cli) {
            cli = new utils_1.CLI(process.env.KYVE_RUNTIME, process.env.KYVE_VERSION);
        }
        cli.parse();
        const options = cli.opts();
        this.poolId = options.poolId;
        this.runtime = cli.runtime;
        this.version = cli.packageVersion;
        this.stake = options.initialStake || "0";
        this.keyfile = JSON.parse((0, fs_1.readFileSync)(options.keyfile, "utf-8"));
        this.runMetrics = options.metrics;
        this.name = this.generateRandomName(options.mnemonic);
        this.chainVersion = "v1beta1";
        this.wallet = new sdk_1.KyveWallet(options.network, options.mnemonic);
        this.sdk = new sdk_1.KyveSDK(this.wallet);
        this.cache = new cache_1.Cache(this.name);
        if (!(0, fs_1.existsSync)("./logs")) {
            (0, fs_1.mkdirSync)("./logs");
        }
        const logToTransport = (log) => {
            (0, fs_1.appendFileSync)(`./logs/${this.name}.txt`, JSON.stringify(log) + "\n");
        };
        this.logger = new tslog_1.Logger({
            displayFilePath: "hidden",
            displayFunctionName: false,
        });
        this.logger.setSettings({
            minLevel: options.verbose ? undefined : "info",
        });
        this.logger.attachTransport({
            silly: logToTransport,
            debug: logToTransport,
            trace: logToTransport,
            info: logToTransport,
            warn: logToTransport,
            error: logToTransport,
            fatal: logToTransport,
        });
        // check if network is valid
        if (options.network === "alpha" ||
            options.network === "beta" ||
            options.network === "local" ||
            options.network === "korellia") {
            this.network = options.network;
        }
        else {
            this.logger.error(`Unknown network "${options.network}". Exiting ...`);
            process.exit(1);
        }
    }
    async start() {
        // log node info
        this.logger.info("Starting node ...");
        console.log("");
        this.logger.info(`Name \t\t = ${this.name}`);
        this.logger.info(`Address \t\t = ${await this.wallet.getAddress()}`);
        this.logger.info(`Pool Id \t\t = ${this.poolId}`);
        this.logger.info(`@kyve/core \t = v${package_json_1.version}`);
        this.logger.info(`${this.runtime} \t = v${this.version}`);
        console.log("");
        this.setupMetrics();
        await this.getPool();
        await this.setupStake();
        await this.getPool(false);
        await this.verifyNode();
        await this.resetCache();
        this.run();
        this.cacheData();
    }
    async run() {
        try {
            const address = await this.wallet.getAddress();
            while (true) {
                console.log("");
                this.logger.info("Starting new bundle proposal");
                // get current pool state and verify node
                await this.getPool(false);
                await this.verifyNode(false);
                // save height of bundle proposal
                const created_at = +this.pool.bundle_proposal.created_at;
                // check if pool is upgrading
                if (+this.pool.upgrade_plan.scheduled_at > 0 &&
                    Math.floor(Date.now() / 1000) >= +this.pool.upgrade_plan.scheduled_at) {
                    this.logger.warn(" Pool is upgrading. Idling ...");
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                // check if pool is paused
                if (this.pool.paused) {
                    this.logger.warn(" Pool is paused. Idling ...");
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                // check if enough nodes are online
                if (this.pool.stakers.length < 2) {
                    this.logger.warn(" Not enough nodes online. Waiting for another validator to join. Idling ...");
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                // check if pool is funded
                if (+this.pool.total_funds === 0) {
                    this.logger.warn(" Pool is out of funds. Waiting for additional funds. Idling ...");
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                if (this.pool.bundle_proposal.next_uploader === address) {
                    this.logger.info("Selected as UPLOADER");
                }
                else {
                    this.logger.info("Selected as VALIDATOR");
                }
                if (this.pool.bundle_proposal.uploader &&
                    this.pool.bundle_proposal.uploader !== address) {
                    let canVote = {
                        possible: false,
                        reason: "Failed to execute canVote query",
                    };
                    try {
                        const { data } = await axios_1.default.get(`${this.wallet.getRestEndpoint()}/kyve/registry/${this.chainVersion}/can_vote/${this.poolId}/${address}/${this.pool.bundle_proposal.bundle_id}`);
                        canVote = data;
                    }
                    catch { }
                    if (canVote.possible) {
                        await this.validateProposal(created_at, canVote.reason === "KYVE_VOTE_NO_ABSTAIN_ALLOWED");
                        await this.getPool(false);
                    }
                    else {
                        this.logger.debug(`Can not vote this round: Reason: ${canVote.reason}`);
                    }
                }
                // claim uploader role if genesis bundle
                if (!this.pool.bundle_proposal.next_uploader &&
                    this.pool.stakers.length > 1 &&
                    +this.pool.total_funds > 0 &&
                    !this.pool.paused) {
                    if (!(+this.pool.upgrade_plan.scheduled_at > 0 &&
                        Math.floor(Date.now() / 1000) >=
                            +this.pool.upgrade_plan.scheduled_at)) {
                        await this.claimUploaderRole();
                        continue;
                    }
                }
                // submit bundle proposals if node is next uploader
                if (this.pool.bundle_proposal.next_uploader === address) {
                    let transaction = null;
                    const remaining = this.remainingUploadInterval();
                    this.logger.debug(`Waiting for remaining upload interval = ${remaining.toString()}s ...`);
                    // sleep until upload interval is reached
                    await (0, helpers_1.sleep)(remaining.multipliedBy(1000).toNumber());
                    this.logger.debug(`Reached upload interval`);
                    await this.getPool(false);
                    if (+this.pool.bundle_proposal.created_at > +created_at) {
                        continue;
                    }
                    let canPropose = {
                        possible: false,
                        reason: "Failed to execute can_propose query",
                    };
                    while (true) {
                        try {
                            const { data } = await axios_1.default.get(`${this.wallet.getRestEndpoint()}/kyve/registry/${this.chainVersion}/can_propose/${this.poolId}/${address}/${this.pool.bundle_proposal.to_height ||
                                this.pool.current_height}`);
                            canPropose = data;
                            if (!canPropose.possible &&
                                canPropose.reason === "Upload interval not surpassed") {
                                await (0, helpers_1.sleep)(1000);
                                continue;
                            }
                            else {
                                break;
                            }
                        }
                        catch {
                            await (0, helpers_1.sleep)(10 * 1000);
                            break;
                        }
                    }
                    if (canPropose.possible) {
                        this.logger.info(`Creating new bundle proposal of type ${constants_1.KYVE_ARWEAVE_BUNDLE}`);
                        const fromHeight = +this.pool.bundle_proposal.to_height || +this.pool.current_height;
                        const toHeight = +this.pool.max_bundle_size + fromHeight;
                        const fromKey = this.pool.bundle_proposal.to_key || this.pool.current_key;
                        const uploadBundle = await this.loadBundle(fromHeight, toHeight);
                        if (uploadBundle.bundle.length) {
                            // upload bundle to Arweave
                            transaction = await this.uploadBundleToArweave(uploadBundle);
                            // submit bundle proposal
                            if (transaction) {
                                await this.submitBundleProposal(transaction.id, +transaction.data_size, fromHeight, fromHeight + uploadBundle.bundle.length, fromKey, uploadBundle.toKey, uploadBundle.toValue);
                            }
                        }
                        else {
                            this.logger.info(`Creating new bundle proposal of type ${constants_1.KYVE_NO_DATA_BUNDLE}`);
                            const bundleId = `KYVE_NO_DATA_BUNDLE_${this.poolId}_${Math.floor(Date.now() / 1000)}`;
                            await this.submitBundleProposal(bundleId, 0, fromHeight, fromHeight, fromKey, "", "");
                        }
                    }
                    else {
                        this.logger.debug(`Can not propose: ${canPropose.reason}. Skipping upload ...`);
                    }
                }
                else {
                    // let validators wait for next bundle proposal
                    await this.nextBundleProposal(created_at);
                }
            }
        }
        catch (error) {
            this.logger.error(`Runtime error. Exiting ...`);
            this.logger.debug(error);
            process.exit(1);
        }
    }
    async cacheData() {
        let createdAt = 0;
        let currentHeight = 0;
        let toHeight = 0;
        let maxHeight = 0;
        while (true) {
            // a smaller to_height means a bundle got dropped or invalidated
            if (+this.pool.bundle_proposal.to_height < toHeight) {
                await this.resetCache();
            }
            // cache data items from current height to required height
            createdAt = +this.pool.bundle_proposal.created_at;
            currentHeight = +this.pool.current_height;
            toHeight =
                +this.pool.bundle_proposal.to_height || +this.pool.current_height;
            maxHeight = +this.pool.max_bundle_size + toHeight;
            // clear finalized items
            let current = currentHeight;
            while (current > 0) {
                current--;
                try {
                    await this.cache.del(current);
                }
                catch {
                    break;
                }
            }
            let startHeight;
            let key;
            // determine from which height to continue caching
            if (await this.cache.exists(toHeight - 1)) {
                startHeight = toHeight;
                key = this.pool.bundle_proposal.to_key;
            }
            else {
                startHeight = currentHeight;
                key = this.pool.current_key;
            }
            this.logger.debug(`Caching from height ${startHeight} to ${maxHeight} ...`);
            for (let height = startHeight; height < maxHeight; height++) {
                for (let requests = 1; requests < 30; requests++) {
                    try {
                        let nextKey;
                        if (key) {
                            nextKey = await this.getNextKey(key);
                        }
                        else {
                            nextKey = this.pool.start_key;
                        }
                        const item = await this.getDataItem(key);
                        await this.cache.put(height, item);
                        await (0, helpers_1.sleep)(50);
                        key = nextKey;
                        break;
                    }
                    catch {
                        this.logger.warn(` Failed to get data item from height ${height}`);
                        await (0, helpers_1.sleep)(requests * 10 * 1000);
                    }
                }
            }
            // wait until new bundle proposal gets created
            while (createdAt === +this.pool.bundle_proposal.created_at) {
                await (0, helpers_1.sleep)(1000);
            }
        }
    }
    async getDataItem(key) {
        this.logger.error(`mandatory "getDataItem" method not implemented. Exiting ...`);
        process.exit(1);
    }
    async getNextKey(key) {
        this.logger.error(`mandatory "getNextKey" method not implemented. Exiting ...`);
        process.exit(1);
    }
    async formatValue(value) {
        this.logger.error(`mandatory "formatValue" method not implemented. Exiting ...`);
        process.exit(1);
    }
    async resetCache() {
        // reset cache
        try {
            this.logger.debug(`Resetting cache ...`);
            await this.cache.drop();
            this.logger.debug(`Successfully resetted cache ...`);
        }
        catch {
            this.logger.warn(" Failed to reset cache. Continuing ...");
        }
    }
    async loadBundle(fromHeight, toHeight) {
        const bundle = [];
        for (let height = fromHeight; height < toHeight; height++) {
            try {
                bundle.push(await this.cache.get(height));
            }
            catch {
                break;
            }
        }
        let toKey = "";
        let toValue = "";
        if (bundle.length) {
            const latestItem = bundle[bundle.length - 1];
            toKey = latestItem.key;
            toValue = await this.formatValue(latestItem.value);
        }
        return {
            fromHeight,
            toHeight,
            bundle,
            toKey,
            toValue,
        };
    }
    async validateProposal(created_at, abstain) {
        this.logger.info(`Validating bundle ${this.pool.bundle_proposal.bundle_id}`);
        let alreadyVotedWithAbstain = abstain;
        let arweaveBundle;
        while (true) {
            await this.getPool(false);
            const remaining = this.remainingUploadInterval();
            if (+this.pool.bundle_proposal.created_at > created_at) {
                // check if new proposal is available in the meantime
                break;
            }
            else if (remaining.isZero()) {
                // check if upload interval was reached in the meantime
                this.logger.debug(`Reached upload interval. Skipping vote ...`);
                break;
            }
            else if (this.pool.paused) {
                // check if pool got paused in the meantime
                break;
            }
            // try to download bundle from arweave
            if (!arweaveBundle) {
                this.logger.debug(`Downloading bundle from Arweave ...`);
                arweaveBundle = await this.downloadBundleFromArweave();
                if (arweaveBundle) {
                    this.logger.debug(`Successfully downloaded bundle from Arweave`);
                }
                else {
                    this.logger.warn(` Could not download bundle from Arweave. Retrying in 10s ...`);
                    if (!alreadyVotedWithAbstain) {
                        await this.vote(this.pool.bundle_proposal.bundle_id, 3);
                        alreadyVotedWithAbstain = true;
                    }
                    await (0, helpers_1.sleep)(10 * 1000);
                    continue;
                }
            }
            // try to load local bundle
            const currentHeight = +this.pool.current_height;
            const toHeight = +this.pool.bundle_proposal.to_height || +this.pool.current_height;
            this.logger.debug(`Loading local bundle from ${currentHeight} to ${toHeight} ...`);
            const localBundle = await this.loadBundle(currentHeight, toHeight);
            await this.cache.put(this.pool.bundle_proposal.bundle_id, localBundle.bundle);
            // check if bundle length is equal to request bundle
            if (localBundle.bundle.length !== toHeight - currentHeight) {
                this.logger.warn(` Could not load local bundle from ${currentHeight} to ${toHeight}. Retrying in 10s ...`);
                if (!alreadyVotedWithAbstain) {
                    await this.vote(this.pool.bundle_proposal.bundle_id, 3);
                    alreadyVotedWithAbstain = true;
                }
                await (0, helpers_1.sleep)(10 * 1000);
                continue;
            }
            // validate bundle if local bundle and arweave bundle was found
            try {
                const uploadBundle = JSON.parse((0, zlib_1.gunzipSync)(arweaveBundle).toString());
                let support = true;
                const localKey = this.pool.bundle_proposal.to_key;
                const uploadKey = uploadBundle[uploadBundle.length - 1].key;
                const localValue = this.pool.bundle_proposal.to_value;
                const uploadValue = await this.formatValue(uploadBundle[uploadBundle.length - 1].value);
                console.log("");
                this.logger.debug("Comparing by byte size / key / value:");
                this.logger.debug(`Local bundle: \t${this.pool.bundle_proposal.byte_size}\t${localKey}\t${localValue}`);
                this.logger.debug(`Upload bundle: \t${arweaveBundle.byteLength}\t${uploadKey}\t${uploadValue}`);
                if (+this.pool.bundle_proposal.byte_size !== +arweaveBundle.byteLength ||
                    localKey !== uploadKey ||
                    localValue !== uploadValue) {
                    support = false;
                }
                if (support) {
                    support = await this.validate(localBundle.bundle, uploadBundle);
                }
                if (support) {
                    await this.vote(this.pool.bundle_proposal.bundle_id, 1);
                }
                else {
                    await this.vote(this.pool.bundle_proposal.bundle_id, 2);
                }
            }
            catch {
                this.logger.warn(` Could not gunzip bundle ...`);
                await this.vote(this.pool.bundle_proposal.bundle_id, 2);
            }
            finally {
                break;
            }
        }
    }
    async validate(localBundle, uploadBundle) {
        const localHash = (0, object_hash_1.default)(localBundle);
        const uploadHash = (0, object_hash_1.default)(uploadBundle);
        console.log("");
        this.logger.debug("Comparing by hash:");
        this.logger.debug(`Local bundle: \t${localHash}`);
        this.logger.debug(`Upload bundle: \t${uploadHash}`);
        console.log("");
        if (localHash !== uploadHash) {
            return false;
        }
        return true;
    }
    async downloadBundleFromArweave() {
        try {
            const { status } = await this.arweave.transactions.getStatus(this.pool.bundle_proposal.bundle_id);
            if (status === 200 || status === 202) {
                const { data: downloadBundle } = await axios_1.default.get(`https://arweave.net/${this.pool.bundle_proposal.bundle_id}`, { responseType: "arraybuffer" });
                return downloadBundle;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async uploadBundleToArweave(uploadBundle) {
        try {
            this.logger.debug("Uploading bundle to Arweave ...");
            const transaction = await this.arweave.createTransaction({
                data: (0, zlib_1.gzipSync)(Buffer.from(JSON.stringify(uploadBundle.bundle))),
            });
            this.logger.debug(`Bundle details = bytes: ${transaction.data_size}, items: ${uploadBundle.bundle.length}`);
            transaction.addTag("Application", "KYVE");
            transaction.addTag("Network", this.network);
            transaction.addTag("Pool", this.poolId.toString());
            transaction.addTag("@kyve/core", package_json_1.version);
            transaction.addTag(this.runtime, this.version);
            transaction.addTag("Uploader", this.pool.bundle_proposal.next_uploader);
            transaction.addTag("FromHeight", uploadBundle.fromHeight.toString());
            transaction.addTag("ToHeight", uploadBundle.toHeight.toString());
            transaction.addTag("Content-Type", "application/gzip");
            await this.arweave.transactions.sign(transaction, this.keyfile);
            try {
                const balance = await this.arweave.wallets.getBalance(await this.arweave.wallets.getAddress(this.keyfile));
                if (+transaction.reward > +balance) {
                    this.logger.error("Not enough funds in Arweave wallet. Exiting ...");
                    process.exit(1);
                }
            }
            catch {
                this.logger.warn(" Failed to load Arweave account balance. Skipping upload ...");
                return null;
            }
            await this.arweave.transactions.post(transaction);
            this.logger.debug(`Uploaded bundle with tx id: ${transaction.id}`);
            return transaction;
        }
        catch {
            this.logger.warn(" Failed to upload bundle to Arweave. Retrying in 30s ...");
            await (0, helpers_1.sleep)(30 * 1000);
            return null;
        }
    }
    async submitBundleProposal(bundleId, byteSize, fromHeight, toHeight, fromKey, toKey, toValue) {
        try {
            this.logger.debug(`Submitting bundle proposal ...`);
            const { transactionHash, transactionBroadcast } = await this.sdk.submitBundleProposal(this.poolId, bundleId, byteSize, fromHeight, toHeight, fromKey, toKey, toValue);
            this.logger.debug(`Transaction = ${transactionHash}`);
            const res = await transactionBroadcast;
            if (res.code === 0) {
                this.logger.info(`Successfully submitted bundle proposal ${bundleId}`);
            }
            else {
                this.logger.warn(` Could not submit bundle proposal. Skipping ...`);
            }
        }
        catch (error) {
            this.logger.error("Failed to submit bundle proposal. Retrying in 30s ...");
            this.logger.error(error);
            await (0, helpers_1.sleep)(30 * 1000);
        }
    }
    async claimUploaderRole() {
        try {
            this.logger.debug("Claiming uploader role ...");
            const { transactionHash, transactionBroadcast } = await this.sdk.claimUploaderRole(this.poolId);
            this.logger.debug(`Transaction = ${transactionHash}`);
            const res = await transactionBroadcast;
            if (res.code === 0) {
                this.logger.info(`Successfully claimed uploader role`);
            }
            else {
                this.logger.warn(` Could not claim uploader role. Skipping ...`);
            }
        }
        catch (error) {
            this.logger.error("Failed to claim uploader role. Skipping ...");
            await (0, helpers_1.sleep)(10 * 1000);
        }
    }
    remainingUploadInterval() {
        const unixNow = new bignumber_js_1.default(Math.floor(Date.now() / 1000));
        const uploadTime = new bignumber_js_1.default(this.pool.bundle_proposal.created_at).plus(this.pool.upload_interval);
        let remaining = new bignumber_js_1.default(0);
        if (unixNow.lt(uploadTime)) {
            remaining = uploadTime.minus(unixNow);
        }
        return remaining;
    }
    async nextBundleProposal(created_at) {
        return new Promise(async (resolve) => {
            this.logger.debug("Waiting for new proposal ...");
            while (true) {
                await this.getPool(false);
                // check if new proposal is available in the meantime
                if (+this.pool.bundle_proposal.created_at > created_at) {
                    break;
                }
                else if (this.pool.paused) {
                    break;
                }
                else {
                    await (0, helpers_1.sleep)(10 * 1000);
                }
            }
            resolve();
        });
    }
    async vote(bundleId, vote) {
        try {
            let voteMessage = "";
            if (vote === 1) {
                voteMessage = "valid";
            }
            else if (vote === 2) {
                voteMessage = "invalid";
            }
            else if (vote === 3) {
                voteMessage = "abstain";
            }
            else {
                throw Error(`Invalid vote: ${vote}`);
            }
            this.logger.debug(`Voting ${voteMessage} on bundle ${bundleId} ...`);
            const { transactionHash, transactionBroadcast } = await this.sdk.voteProposal(this.poolId, bundleId, vote);
            this.logger.debug(`Transaction = ${transactionHash}`);
            const res = await transactionBroadcast;
            if (res.code === 0) {
                this.logger.info(`Voted ${voteMessage} on bundle ${bundleId}`);
            }
            else {
                this.logger.warn(` Could not vote on proposal. Skipping ...`);
            }
        }
        catch (error) {
            this.logger.error("Failed to vote. Skipping ...");
            this.logger.debug(error);
        }
    }
    setupMetrics() {
        if (this.runMetrics) {
            this.logger.info("Starting metric server on: http://localhost:8080/metrics");
            // HTTP server which exposes the metrics on http://localhost:8080/metrics
            http_1.default
                .createServer(async (req, res) => {
                // Retrieve route from request object
                const route = url_1.default.parse(req.url).pathname;
                if (route === "/metrics") {
                    // Return all metrics the Prometheus exposition format
                    res.setHeader("Content-Type", prom_client_1.register.contentType);
                    const defaultMetrics = await prom_client_1.register.metrics();
                    const other = await KYVE.metrics.register.metrics();
                    res.end(defaultMetrics + "\n" + other);
                }
            })
                .listen(8080);
        }
    }
    async getPool(logs = true) {
        if (logs) {
            this.logger.debug("Attempting to fetch pool state.");
        }
        return new Promise(async (resolve) => {
            var _a;
            let requests = 1;
            while (true) {
                try {
                    const { data: { pool }, } = await axios_1.default.get(`${this.wallet.getRestEndpoint()}/kyve/registry/${this.chainVersion}/pool/${this.poolId}`);
                    this.pool = { ...pool };
                    try {
                        this.pool.config = JSON.parse(this.pool.config);
                    }
                    catch (error) {
                        if (logs) {
                            this.logger.warn(` Failed to parse the pool config: ${(_a = this.pool) === null || _a === void 0 ? void 0 : _a.config}`);
                        }
                        this.pool.config = {};
                    }
                    // Validate runtime
                    if (this.pool.runtime === this.runtime) {
                        if (logs) {
                            this.logger.info(`Running node on runtime ${this.runtime}.`);
                        }
                    }
                    else {
                        this.logger.error("Specified pool does not match the integration runtime");
                        process.exit(1);
                    }
                    // Validate version
                    if (this.pool.protocol.version === this.version) {
                        if (logs) {
                            this.logger.info("Pool version requirements met");
                        }
                    }
                    else {
                        this.logger.error(`Running an invalid version. Version requirements are ${this.pool.protocol.version}`);
                        process.exit(1);
                    }
                    break;
                }
                catch (error) {
                    this.logger.warn(` Failed to fetch pool state. Retrying in ${requests * 10}s ...`);
                    await (0, helpers_1.sleep)(requests * 10 * 1000);
                    // limit timeout to 5 mins
                    if (requests < 30) {
                        requests++;
                    }
                }
            }
            if (logs) {
                this.logger.info("Fetched pool state");
            }
            resolve();
        });
    }
    async setupStake() {
        const address = await this.wallet.getAddress();
        let balance = new bignumber_js_1.default(0);
        let initialStake = new bignumber_js_1.default(0);
        let currentStake = new bignumber_js_1.default(0);
        let minimumStake = new bignumber_js_1.default(0);
        let requests = 1;
        while (true) {
            try {
                const { data } = await axios_1.default.get(`${this.wallet.getRestEndpoint()}/kyve/registry/${this.chainVersion}/stake_info/${this.poolId}/${address}`);
                balance = new bignumber_js_1.default(data.balance);
                currentStake = new bignumber_js_1.default(data.current_stake);
                minimumStake = new bignumber_js_1.default(data.minimum_stake);
                break;
            }
            catch (error) {
                this.logger.warn(` Failed to fetch stake info of address. Retrying in ${requests * 10}s ...`);
                await (0, helpers_1.sleep)(requests * 10 * 1000);
                // limit timeout to 5 mins
                if (requests < 30) {
                    requests++;
                }
            }
        }
        // check if node has already staked
        if (currentStake.isZero()) {
            // try to parse the provided inital staking amount
            try {
                initialStake = new bignumber_js_1.default(this.stake).multipliedBy(10 ** 9);
                if (initialStake.toString() === "NaN") {
                    this.logger.error("Could not parse initial stake. Exiting ...");
                    process.exit(1);
                }
                if (initialStake.isZero()) {
                    this.logger.error("Initial stake can not be zero. Please provide a higher stake. Exiting ...");
                    process.exit(0);
                }
            }
            catch (error) {
                this.logger.error("Could not parse initial stake. Exiting ...");
                this.logger.debug(error);
                process.exit(1);
            }
            // check if node operator has more stake than the required minimum stake
            if (initialStake.lte(minimumStake)) {
                this.logger.error(` Minimum stake is ${(0, helpers_1.toHumanReadable)(minimumStake.toString())} $KYVE - initial stake only ${(0, helpers_1.toHumanReadable)(initialStake.toString())} $KYVE. Please provide a higher staking amount. Exiting ...`);
                process.exit(0);
            }
            try {
                // check if node operator has enough balance to stake
                if (balance.lt(initialStake)) {
                    this.logger.error(`Not enough $KYVE in wallet. Exiting ...`);
                    process.exit(0);
                }
                this.logger.debug(`Staking ${(0, helpers_1.toHumanReadable)(initialStake.toString())} $KYVE ...`);
                const { transactionHash, transactionBroadcast } = await this.sdk.stake(this.poolId, initialStake);
                this.logger.debug(`Transaction = ${transactionHash}`);
                const res = await transactionBroadcast;
                if (res.code === 0) {
                    this.logger.info(`Successfully staked ${(0, helpers_1.toHumanReadable)(initialStake.toString())} $KYVE`);
                    this.logger.info(`Running node with a stake of ${(0, helpers_1.toHumanReadable)(initialStake.toString())} $KYVE`);
                }
                else {
                    this.logger.warn(` Could not stake ${(0, helpers_1.toHumanReadable)(initialStake.toString())} $KYVE. Skipping ...`);
                }
            }
            catch {
                this.logger.error(`Failed to stake. Skipping initial stake ...`);
            }
        }
        else {
            this.logger.info(`Node is already staked. Skipping ...`);
            this.logger.info(`Running node with a stake of ${(0, helpers_1.toHumanReadable)(currentStake.toString())} $KYVE`);
        }
        console.log("");
        this.logger.info(`Joining KYVE network ...`);
        console.log("");
    }
    async verifyNode(logs = true) {
        if (logs) {
            this.logger.debug("Attempting to verify node.");
        }
        const address = await this.wallet.getAddress();
        const isStaker = (this.pool.stakers || []).includes(address);
        if (isStaker) {
            if (logs) {
                this.logger.info("Node is running as a validator.");
            }
        }
        else {
            this.logger.error(`Node is not an active validator! Exiting ...`);
            process.exit(1);
        }
    }
    generateRandomName(mnemonic) {
        const r = new prando_1.default(mnemonic + this.poolId + this.version);
        return (0, unique_names_generator_1.uniqueNamesGenerator)({
            dictionaries: [unique_names_generator_1.adjectives, unique_names_generator_1.colors, unique_names_generator_1.animals],
            separator: "-",
            length: 3,
            style: "lowerCase",
            seed: r.nextInt(0, unique_names_generator_1.adjectives.length * unique_names_generator_1.colors.length * unique_names_generator_1.animals.length),
        }).replace(" ", "-");
    }
}
KYVE.metrics = prom_client_1.default;
exports.default = KYVE;
