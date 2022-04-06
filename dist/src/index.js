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
const semver_1 = require("semver");
const tslog_1 = require("tslog");
const utils_1 = require("./utils");
const helpers_1 = require("./utils/helpers");
const package_json_1 = require("../package.json");
const object_hash_1 = __importDefault(require("object-hash"));
const http_1 = __importDefault(require("http"));
const url_1 = __importDefault(require("url"));
const prom_client_1 = __importStar(require("prom-client"));
const database_1 = require("./utils/database");
const du_1 = __importDefault(require("du"));
const zlib_1 = require("zlib");
const axios_1 = __importDefault(require("axios"));
const object_sizeof_1 = __importDefault(require("object-sizeof"));
const unique_names_generator_1 = require("unique-names-generator");
const sdk_1 = require("@kyve/sdk");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const constants_1 = require("./utils/constants");
__exportStar(require("./utils"), exports);
__exportStar(require("./faces"), exports);
__exportStar(require("./utils/helpers"), exports);
__exportStar(require("./utils/database"), exports);
prom_client_1.default.collectDefaultMetrics({
    labels: { app: "kyve-core" },
});
const metricsCacheHeight = new prom_client_1.default.Gauge({
    name: "current_cache_height",
    help: "The current height the cache has indexed to.",
});
const metricsDbSize = new prom_client_1.default.Gauge({
    name: "current_db_size",
    help: "The size of the local database.",
});
const metricsDbUsed = new prom_client_1.default.Gauge({
    name: "current_db_used",
    help: "The database usage in percent.",
});
class KYVE {
    constructor(cli) {
        var _a;
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
        this.stake = options.stake;
        this.keyfile = JSON.parse((0, fs_1.readFileSync)(options.keyfile, "utf-8"));
        this.runMetrics = options.metrics;
        this.name = (_a = options === null || options === void 0 ? void 0 : options.name) !== null && _a !== void 0 ? _a : this.generateRandomName(options.mnemonic);
        this.chainVersion = "v1beta1";
        this.wallet = new sdk_1.KyveWallet(options.network, options.mnemonic);
        this.sdk = new sdk_1.KyveSDK(this.wallet);
        this.db = new database_1.Database(this.name);
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
        // check if disk space is greater than 0
        if (+options.batchSize > 0) {
            this.space = +options.space;
        }
        else {
            this.logger.error(`❌ INTERNAL ERROR: Disk space has to be greater than 0 bytes. Exiting ...`);
            process.exit(1);
        }
        // check if batch size is greater than 0
        if (+options.batchSize > 0) {
            this.batchSize = +options.batchSize;
        }
        else {
            this.logger.error(`❌ INTERNAL ERROR: Batch size has to be greater than 0. Exiting ...`);
            process.exit(1);
        }
        // check if network is valid
        if (options.network === "alpha" ||
            options.network === "beta" ||
            options.network === "local" ||
            options.network === "korellia") {
            this.network = options.network;
        }
        else {
            this.logger.error(`❌ INTERNAL ERROR: Unknown network "${options.network}". Exiting ...`);
            process.exit(1);
        }
    }
    async start() {
        await this.logNodeInfo();
        this.setupMetrics();
        await this.getPool();
        await this.setupStake();
        await this.getPool(false);
        await this.verifyNode();
        this.cache();
        this.logCacheHeight();
        this.run();
    }
    async run() {
        try {
            const address = await this.wallet.getAddress();
            while (true) {
                console.log("");
                this.logger.info("⚡️ Starting new proposal");
                // get current pool state
                await this.getPool(false);
                // save height of bundle proposal
                const created_at = this.pool.bundle_proposal.created_at;
                // check if pool is paused
                if (this.pool.paused) {
                    this.logger.warn("⚠️  Pool is paused. Idling ...");
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                // check if enough nodes are online
                if (this.pool.stakers.length < 2) {
                    this.logger.warn("⚠️  Not enough nodes online. Waiting for another validator to join. Idling ...");
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                await this.verifyNode(false);
                await this.clearFinalizedData();
                if (this.pool.bundle_proposal.next_uploader === address) {
                    this.logger.info("📚 Selected as UPLOADER");
                }
                else {
                    this.logger.info("🧐 Selected as VALIDATOR");
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
                        await this.validateProposal(created_at);
                        await this.getPool(false);
                    }
                    else {
                        this.logger.debug(`Can not vote this round: Reason: ${canVote.reason}`);
                    }
                }
                // check if new proposal is available in the meantime
                if (+this.pool.bundle_proposal.created_at > +created_at) {
                    continue;
                }
                else if (this.pool.paused) {
                    continue;
                }
                // claim uploader role if genesis bundle
                if (!this.pool.bundle_proposal.next_uploader) {
                    await this.claimUploaderRole();
                    continue;
                }
                // submit bundle proposals if node is next uploader
                if (this.pool.bundle_proposal.next_uploader === address) {
                    let transaction = null;
                    const unixNow = new bignumber_js_1.default(Math.floor(Date.now() / 1000));
                    const uploadTime = new bignumber_js_1.default(this.pool.bundle_proposal.created_at).plus(this.pool.upload_interval);
                    let remainingUploadInterval = new bignumber_js_1.default(0);
                    if (unixNow.lt(uploadTime)) {
                        remainingUploadInterval = uploadTime.minus(unixNow);
                    }
                    this.logger.debug(`Waiting for remaining upload interval = ${remainingUploadInterval.toString()}s ...`);
                    // sleep until upload interval is reached
                    await (0, helpers_1.sleep)(remainingUploadInterval.multipliedBy(1000).toNumber());
                    this.logger.debug(`Reached upload interval`);
                    let canPropose = {
                        possible: false,
                        reason: "Failed to execute can_propose query",
                    };
                    while (true) {
                        try {
                            const { data } = await axios_1.default.get(`${this.wallet.getRestEndpoint()}/kyve/registry/${this.chainVersion}/can_propose/${this.poolId}/${address}`);
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
                        catch { }
                    }
                    if (canPropose.possible) {
                        if (canPropose.reason === constants_1.NO_QUORUM_BUNDLE) {
                            this.logger.info(`📦 Creating new bundle proposal of type ${constants_1.NO_QUORUM_BUNDLE}`);
                            await this.submitBundleProposal(constants_1.NO_QUORUM_BUNDLE, 0, 0);
                        }
                        else {
                            this.logger.info(`📦 Creating new bundle proposal of type ${constants_1.ARWEAVE_BUNDLE}`);
                            const uploadBundle = await this.createBundle();
                            if (uploadBundle.bundleSize) {
                                // upload bundle to Arweave
                                transaction = await this.uploadBundleToArweave(uploadBundle);
                                // submit bundle proposal
                                if (transaction) {
                                    await this.submitBundleProposal(transaction.id, +transaction.data_size, uploadBundle.bundleSize);
                                }
                            }
                            else {
                                this.logger.info(`📦 Creating new bundle proposal of type ${constants_1.NO_DATA_BUNDLE}`);
                                await this.submitBundleProposal(constants_1.NO_DATA_BUNDLE, 0, 0);
                            }
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
            this.logger.error(`❌ INTERNAL ERROR: Runtime error. Exiting ...`);
            this.logger.debug(error);
            process.exit(1);
        }
    }
    async logCacheHeight() {
        setInterval(async () => {
            let height = 0;
            let head = 0;
            let tail = 0;
            try {
                height = parseInt(this.pool.height_archived);
                head = parseInt(await this.db.get("head"));
                tail = parseInt(await this.db.get("tail"));
                // reset cache and continue with pool height
                if (height < tail) {
                    this.logger.debug(`Resetting cache ...`);
                    await this.db.drop();
                }
                // continue from current cache height
                if (height < head) {
                    height = head;
                }
            }
            catch { }
            this.logger.debug(`Cached to height = ${height}`);
        }, 60 * 1000);
    }
    async cache() {
        while (true) {
            let height = 0;
            let head = 0;
            let tail = 0;
            try {
                height = parseInt(this.pool.height_archived);
                head = parseInt(await this.db.get("head"));
                tail = parseInt(await this.db.get("tail"));
                // reset cache and continue with pool height
                if (height < tail) {
                    this.logger.debug(`Resetting cache ...`);
                    await this.db.drop();
                }
                // continue from current cache height
                if (height < head) {
                    height = head;
                }
            }
            catch { }
            const targetHeight = height + this.batchSize;
            try {
                const usedDiskSpace = await (0, du_1.default)(`./db/${this.name}/`);
                const usedDiskSpacePercent = parseFloat(((usedDiskSpace * 100) / this.space).toFixed(2));
                metricsCacheHeight.set(height);
                metricsDbSize.set(usedDiskSpace);
                metricsDbUsed.set(usedDiskSpacePercent);
                if (usedDiskSpace > this.space) {
                    this.logger.debug(`Used disk space: ${usedDiskSpacePercent}%`);
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                const batch = [];
                for (let h = height; h < targetHeight; h++) {
                    batch.push(this.getDataItemAndSave(h));
                    await (0, helpers_1.sleep)(10);
                }
                await Promise.all(batch);
                await this.db.put("head", targetHeight);
            }
            catch (error) {
                this.logger.warn(`⚠️  EXTERNAL ERROR: Failed to write data items from height = ${height} to ${targetHeight} to local DB`);
                this.logger.debug(error);
                await (0, helpers_1.sleep)(10 * 1000);
            }
        }
    }
    async getDataItem(key) {
        this.logger.error(`❌ INTERNAL ERROR: mandatory "getDataItem" method not implemented. Exiting ...`);
        process.exit(1);
    }
    async getDataItemAndSave(height) {
        while (true) {
            try {
                const { key, value } = await this.getDataItem(height);
                await this.db.put(key, value);
                break;
            }
            catch {
                await (0, helpers_1.sleep)(1000);
            }
        }
    }
    async createBundle() {
        const bundleDataSizeLimit = 20 * 1000 * 1000; // 20 MB
        const bundleItemSizeLimit = 1000;
        const bundle = [];
        let currentDataSize = 0;
        let h = +this.pool.bundle_proposal.to_height;
        this.logger.debug(`Creating bundle from height = ${this.pool.bundle_proposal.to_height} ...`);
        while (true) {
            try {
                const entry = {
                    key: +h,
                    value: await this.db.get(h),
                };
                currentDataSize += (0, object_sizeof_1.default)(entry);
                // break if over data size limit
                if (currentDataSize >= bundleDataSizeLimit) {
                    break;
                }
                // break if bundle item size limit is reached
                if (bundle.length >= bundleItemSizeLimit) {
                    break;
                }
                bundle.push(entry);
                h++;
            }
            catch {
                break;
            }
        }
        return {
            fromHeight: +this.pool.bundle_proposal.to_height,
            toHeight: +this.pool.bundle_proposal.to_height + bundle.length,
            bundleSize: bundle.length,
            bundle: Buffer.from(JSON.stringify(bundle)),
        };
    }
    async loadBundle() {
        const bundle = [];
        let h = +this.pool.bundle_proposal.from_height;
        while (h < +this.pool.bundle_proposal.to_height) {
            try {
                const entry = {
                    key: +h,
                    value: await this.db.get(h),
                };
                bundle.push(entry);
                h++;
            }
            catch {
                await (0, helpers_1.sleep)(1000);
                const unixNow = new bignumber_js_1.default(Math.floor(Date.now() / 1000));
                const uploadTime = new bignumber_js_1.default(this.pool.bundle_proposal.created_at).plus(this.pool.upload_interval);
                // check if upload interval was reached in the meantime
                if (unixNow.gte(uploadTime)) {
                    return null;
                }
            }
        }
        return bundle;
    }
    async clearFinalizedData() {
        let tail;
        try {
            tail = parseInt(await this.db.get("tail"));
        }
        catch {
            tail = parseInt(this.pool.height_archived);
        }
        for (let key = tail; key < parseInt(this.pool.height_archived); key++) {
            try {
                await this.db.del(key);
            }
            catch { }
        }
        await this.db.put("tail", parseInt(this.pool.height_archived));
    }
    async validateProposal(created_at) {
        this.logger.info(`🔬 Validating bundle ${this.pool.bundle_proposal.bundle_id}`);
        // try to fetch bundle
        while (true) {
            await this.getPool(false);
            const unixNow = new bignumber_js_1.default(Math.floor(Date.now() / 1000));
            const uploadTime = new bignumber_js_1.default(this.pool.bundle_proposal.created_at).plus(this.pool.upload_interval);
            if (+this.pool.bundle_proposal.created_at > +created_at) {
                // check if new proposal is available in the meantime
                break;
            }
            else if (unixNow.gte(uploadTime)) {
                // check if upload interval was reached in the meantime
                break;
            }
            else if (this.pool.paused) {
                // check if pool got paused in the meantime
                break;
            }
            // check if NO_DATA_BUNDLE
            if (this.pool.bundle_proposal.bundle_id === constants_1.NO_DATA_BUNDLE) {
                this.logger.debug(`Found bundle of type ${constants_1.NO_DATA_BUNDLE}. Validating if data is available ...`);
                const uploadBundle = await this.createBundle();
                // vote valid if bundle size is zero
                this.vote({
                    transaction: constants_1.NO_DATA_BUNDLE,
                    valid: !uploadBundle.bundleSize,
                });
                break;
            }
            this.logger.debug(`Downloading bundle from Arweave ...`);
            const arweaveBundle = await this.downloadBundleFromArweave();
            if (arweaveBundle) {
                this.logger.debug(`Successfully downloaded bundle from Arweave`);
                this.logger.debug(`Loading local bundle from ${this.pool.bundle_proposal.from_height} to ${this.pool.bundle_proposal.to_height} ...`);
                const localBundle = await this.loadBundle();
                if (localBundle) {
                    try {
                        const uploadBundle = JSON.parse((0, zlib_1.gunzipSync)(arweaveBundle).toString());
                        await this.vote({
                            transaction: this.pool.bundle_proposal.bundle_id,
                            valid: await this.validate(localBundle, +this.pool.bundle_proposal.byte_size, uploadBundle, +arweaveBundle.byteLength),
                        });
                    }
                    catch {
                        this.logger.warn(`⚠️  Could not gunzip bundle ...`);
                        await this.vote({
                            transaction: this.pool.bundle_proposal.bundle_id,
                            valid: false,
                        });
                    }
                    finally {
                        break;
                    }
                }
                else {
                    this.logger.debug(`Reached upload interval. Skipping ...`);
                    break;
                }
            }
            else {
                this.logger.warn(`⚠️  EXTERNAL ERROR: Failed to fetch bundle from Arweave. Retrying in 30s ...`);
                await (0, helpers_1.sleep)(30 * 1000);
            }
        }
    }
    async validate(localBundle, localBytes, uploadBundle, uploadBytes) {
        if (localBytes !== uploadBytes) {
            return false;
        }
        if ((0, object_hash_1.default)(localBundle) !== (0, object_hash_1.default)(uploadBundle)) {
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
                data: (0, zlib_1.gzipSync)(uploadBundle.bundle),
            });
            this.logger.debug(`Bundle details = bytes: ${transaction.data_size}, items: ${uploadBundle.toHeight - uploadBundle.fromHeight}`);
            transaction.addTag("Application", "KYVE - Testnet");
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
                    this.logger.warn("⚠️  EXTERNAL ERROR: Not enough funds in Arweave wallet");
                    process.exit(1);
                }
            }
            catch {
                this.logger.warn("⚠️  EXTERNAL ERROR: Failed to load Arweave account balance. Skipping upload ...");
                return null;
            }
            await this.arweave.transactions.post(transaction);
            this.logger.debug(`Uploaded bundle with tx id: ${transaction.id}`);
            return transaction;
        }
        catch {
            this.logger.warn("⚠️  EXTERNAL ERROR: Failed to upload bundle to Arweave. Retrying in 30s ...");
            await (0, helpers_1.sleep)(30 * 1000);
            return null;
        }
    }
    async submitBundleProposal(bundleId, byteSize, bundleSize) {
        try {
            this.logger.debug(`Submitting bundle proposal ...`);
            const { transactionHash, transactionBroadcast } = await this.sdk.submitBundleProposal(this.poolId, bundleId, byteSize, bundleSize);
            this.logger.debug(`Transaction = ${transactionHash}`);
            const res = await transactionBroadcast;
            if (res.code === 0) {
                this.logger.info(`📤 Successfully submitted bundle proposal ${bundleId}`);
            }
            else {
                this.logger.warn(`⚠️  Could not submit bundle proposal. Skipping ...`);
            }
        }
        catch {
            this.logger.error("❌ INTERNAL ERROR: Failed to submit bundle proposal. Retrying in 30s ...");
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
                this.logger.info(`🔍 Successfully claimed uploader role`);
            }
            else {
                this.logger.warn(`⚠️  Could not claim uploader role. Skipping ...`);
            }
        }
        catch (error) {
            this.logger.error("❌ INTERNAL ERROR: Failed to claim uploader role. Skipping ...");
            this.logger.debug(error);
        }
    }
    async nextBundleProposal(created_at) {
        return new Promise(async (resolve) => {
            this.logger.debug("Waiting for new proposal ...");
            while (true) {
                await this.getPool(false);
                // check if new proposal is available in the meantime
                if (+this.pool.bundle_proposal.created_at > +created_at) {
                    break;
                }
                else if (this.pool.paused) {
                    break;
                }
                else {
                    await (0, helpers_1.sleep)(2 * 1000); // sleep 2 secs
                }
            }
            resolve();
        });
    }
    async vote(vote) {
        try {
            this.logger.debug(`Voting ${vote.valid ? "valid" : "invalid"} on bundle ${vote.transaction} ...`);
            const { transactionHash, transactionBroadcast } = await this.sdk.voteProposal(this.poolId, vote.transaction, vote.valid);
            this.logger.debug(`Transaction = ${transactionHash}`);
            const res = await transactionBroadcast;
            if (res.code === 0) {
                this.logger.info(`🖋  Voted ${vote.valid ? "valid" : "invalid"} on bundle ${vote.transaction}`);
            }
            else {
                this.logger.warn(`⚠️  Could not vote on proposal. Skipping ...`);
            }
        }
        catch (error) {
            this.logger.error("❌ INTERNAL ERROR: Failed to vote. Skipping ...");
            this.logger.debug(error);
        }
    }
    async logNodeInfo() {
        const formatInfoLogs = (input) => {
            const length = Math.max(13, this.runtime.length);
            return input.padEnd(length, " ");
        };
        this.logger.info(`🚀 Starting node ...\n\t${formatInfoLogs("Name")} = ${this.name}\n\t${formatInfoLogs("Address")} = ${await this.wallet.getAddress()}\n\t${formatInfoLogs("Pool Id")} = ${this.poolId}\n\t${formatInfoLogs("Desired Stake")} = ${(0, helpers_1.toHumanReadable)(this.stake)} $KYVE\n\n\t${formatInfoLogs("@kyve/core")} = v${package_json_1.version}\n\t${formatInfoLogs(this.runtime)} = v${this.version}\n`);
    }
    setupMetrics() {
        if (this.runMetrics) {
            this.logger.info("🔬 Starting metric server on: http://localhost:8080/metrics");
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
            var _a, _b;
            while (true) {
                try {
                    const { data: { pool }, } = await axios_1.default.get(`${this.wallet.getRestEndpoint()}/kyve/registry/${this.chainVersion}/pool/${this.poolId}`);
                    this.pool = { ...pool };
                    try {
                        this.pool.config = JSON.parse(this.pool.config);
                    }
                    catch (error) {
                        this.logger.warn(`⚠️  EXTERNAL ERROR: Failed to parse the pool config: ${(_a = this.pool) === null || _a === void 0 ? void 0 : _a.config}`);
                        this.logger.debug(error);
                        this.pool.config = {};
                    }
                    if (this.pool.runtime === this.runtime) {
                        if (logs) {
                            this.logger.info(`💻 Running node on runtime ${this.runtime}.`);
                        }
                    }
                    else {
                        this.logger.error("❌ INTERNAL ERROR: Specified pool does not match the integration runtime");
                        process.exit(1);
                    }
                    try {
                        if ((0, semver_1.satisfies)(this.version, this.pool.versions || this.version)) {
                            if (logs) {
                                this.logger.info("⏱  Pool version requirements met");
                            }
                        }
                        else {
                            this.logger.error(`❌ INTERNAL ERROR: Running an invalid version for the specified pool. Version requirements are ${this.pool.versions}`);
                            process.exit(1);
                        }
                    }
                    catch (error) {
                        this.logger.error(`❌ INTERNAL ERROR: Failed to parse the node version: ${(_b = this.pool) === null || _b === void 0 ? void 0 : _b.versions}`);
                        this.logger.debug(error);
                        process.exit(1);
                    }
                    break;
                }
                catch (error) {
                    this.logger.warn("⚠️  EXTERNAL ERROR: Failed to fetch pool state. Retrying in 10s ...");
                    await (0, helpers_1.sleep)(10 * 1000);
                }
            }
            if (logs) {
                this.logger.info("✅ Fetched pool state");
            }
            resolve();
        });
    }
    async setupStake() {
        var _a, _b, _c, _d;
        const address = await this.wallet.getAddress();
        let stakers = [];
        let desiredStake = new bignumber_js_1.default(0);
        let stake = new bignumber_js_1.default(0);
        let minimumStake = new bignumber_js_1.default(0);
        try {
            desiredStake = new bignumber_js_1.default(this.stake).multipliedBy(10 ** 9);
            if (desiredStake.toString() === "NaN") {
                this.logger.error("❌ INTERNAL ERROR: Could not parse desired stake. Exiting ...");
                process.exit(1);
            }
            if (desiredStake.isZero()) {
                this.logger.warn("⚠️  EXTERNAL ERROR: Desired stake can not be zero. Please provide a higher stake. Exiting ...");
                process.exit(0);
            }
        }
        catch (error) {
            this.logger.error("❌ INTERNAL ERROR: Could not parse desired stake. Exiting ...");
            this.logger.debug(error);
            process.exit(1);
        }
        while (true) {
            try {
                // TODO: create a query which returns balance & stake of address and current minimum stake in pool
                const { data } = await axios_1.default.get(`${this.wallet.getRestEndpoint()}/kyve/registry/${this.chainVersion}/stakers_list/${this.poolId}`);
                stakers = (data.stakers || []).sort((x, y) => {
                    if (new bignumber_js_1.default(x.amount).lt(y.amount)) {
                        return 1;
                    }
                    if (new bignumber_js_1.default(x.amount).gt(y.amount)) {
                        return -1;
                    }
                    return 0;
                });
                break;
            }
            catch (error) {
                this.logger.warn("⚠️  EXTERNAL ERROR: Failed to fetch stakers of pool. Retrying in 10s ...");
                await (0, helpers_1.sleep)(10 * 1000);
            }
        }
        if (stakers.length) {
            stake = new bignumber_js_1.default((_b = (_a = stakers.find((s) => s.account === address)) === null || _a === void 0 ? void 0 : _a.amount) !== null && _b !== void 0 ? _b : 0);
        }
        // TODO: remove hardcoded MAX_STAKERS
        if (stakers.length == 50) {
            minimumStake = new bignumber_js_1.default((_d = (_c = stakers[stakers.length - 1]) === null || _c === void 0 ? void 0 : _c.amount) !== null && _d !== void 0 ? _d : 0);
        }
        if (desiredStake.lte(minimumStake)) {
            this.logger.warn(`⚠️  EXTERNAL ERROR: Minimum stake is ${(0, helpers_1.toHumanReadable)(minimumStake.toString())} $KYVE - desired stake only ${(0, helpers_1.toHumanReadable)(desiredStake.toString())} $KYVE. Please provide a higher staking amount. Exiting ...`);
            process.exit(0);
        }
        if (desiredStake.gt(stake)) {
            try {
                const diff = desiredStake.minus(stake);
                this.logger.debug(`Staking ${(0, helpers_1.toHumanReadable)(diff.toString())} $KYVE ...`);
                const { transactionHash, transactionBroadcast } = await this.sdk.stake(this.poolId, diff);
                this.logger.debug(`Transaction = ${transactionHash}`);
                const res = await transactionBroadcast;
                if (res.code === 0) {
                    this.logger.info(`🔗 Successfully staked ${(0, helpers_1.toHumanReadable)(diff.toString())} $KYVE`);
                }
                else {
                    this.logger.warn(`⚠️  Could not stake ${(0, helpers_1.toHumanReadable)(diff.toString())} $KYVE. Skipping ...`);
                }
            }
            catch {
                this.logger.error(`❌ INTERNAL ERROR: Failed to stake. Skipping ...`);
            }
        }
        else if (desiredStake.lt(stake)) {
            try {
                const diff = stake.minus(desiredStake);
                this.logger.debug(`Unstaking ${(0, helpers_1.toHumanReadable)(diff.toString())} $KYVE ...`);
                const { transactionHash, transactionBroadcast } = await this.sdk.unstake(this.poolId, diff);
                this.logger.debug(`Transaction = ${transactionHash}`);
                const res = await transactionBroadcast;
                if (res.code === 0) {
                    this.logger.info(`🔗 Successfully unstaked ${(0, helpers_1.toHumanReadable)(diff.toString())} $KYVE`);
                }
                else {
                    this.logger.warn(`⚠️  Could not unstake ${(0, helpers_1.toHumanReadable)(diff.toString())} $KYVE. Skipping ...`);
                }
            }
            catch {
                this.logger.error(`❌ INTERNAL ERROR: Failed to unstake. Skipping ...`);
            }
        }
        else {
            this.logger.info(`👌 Already staked with the correct amount.`);
        }
    }
    async verifyNode(logs = true) {
        if (logs) {
            this.logger.debug("Attempting to verify node.");
        }
        const address = await this.wallet.getAddress();
        const isStaker = (this.pool.stakers || []).includes(address);
        if (isStaker) {
            if (logs) {
                this.logger.info("🔍  Node is running as a validator.");
            }
        }
        else {
            this.logger.warn(`⚠️  Node is not an active validator! Exiting ...`);
            process.exit(1);
        }
    }
    generateRandomName(mnemonic) {
        const r = new prando_1.default(mnemonic + this.poolId);
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
