"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const arweave_1 = __importDefault(require("arweave"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const ethers_1 = require("ethers");
const fs_1 = require("fs");
const prando_1 = __importDefault(require("prando"));
const rxjs_1 = require("rxjs");
const semver_1 = require("semver");
const unique_names_generator_1 = require("unique-names-generator");
const utils_1 = require("./utils");
const arweave_2 = require("./utils/arweave");
const logger_1 = __importDefault(require("./utils/logger"));
const helpers_1 = require("./utils/helpers");
const node_json_1 = __importDefault(require("./abi/node.json"));
const package_json_1 = require("../package.json");
__exportStar(require("./utils"), exports);
class KYVE {
    constructor(poolAddress, runtime, version, stakeAmount, privateKey, keyfile, name, endpoint, gasMultiplier = "1") {
        this.buffer = [];
        this.client = new arweave_1.default({
            host: "arweave.net",
            protocol: "https",
        });
        const provider = new ethers_1.ethers.providers.WebSocketProvider(endpoint || "wss://moonbeam-alpha.api.onfinality.io/public-ws", {
            chainId: 1287,
            name: "moonbase-alphanet",
        });
        provider._websocket.on("ping", () => {
            logger_1.default.debug("Received ping ...");
            provider._websocket.pong();
        });
        this.wallet = new ethers_1.Wallet(privateKey, provider);
        this.pool = (0, helpers_1.Pool)(poolAddress, this.wallet);
        this.node = null;
        this.runtime = runtime;
        this.version = version;
        this.stake = stakeAmount;
        this.keyfile = keyfile;
        this.gasMultiplier = gasMultiplier;
        if (name) {
            this.name = name;
        }
        else {
            const r = new prando_1.default(this.wallet.address + this.pool.address);
            this.name = (0, unique_names_generator_1.uniqueNamesGenerator)({
                dictionaries: [unique_names_generator_1.adjectives, unique_names_generator_1.starWars],
                separator: "-",
                length: 2,
                style: "lowerCase",
                seed: r.nextInt(0, unique_names_generator_1.adjectives.length * unique_names_generator_1.starWars.length),
            }).replace(" ", "-");
        }
        if (!(0, fs_1.existsSync)("./logs")) {
            (0, fs_1.mkdirSync)("./logs");
        }
        const logToTransport = (log) => {
            (0, fs_1.appendFileSync)(`./logs/${this.name}.txt`, JSON.stringify(log) + "\n");
        };
        logger_1.default.attachTransport({
            silly: logToTransport,
            debug: logToTransport,
            trace: logToTransport,
            info: logToTransport,
            warn: logToTransport,
            error: logToTransport,
            fatal: logToTransport,
        });
    }
    static async generate(cli) {
        if (!cli) {
            cli = new utils_1.CLI(process.env.KYVE_RUNTIME, process.env.KYVE_VERSION);
        }
        await cli.parseAsync();
        const options = cli.opts();
        const node = new KYVE(options.pool, cli.runtime, cli.packageVersion, options.stake, options.privateKey, 
        // if there is a keyfile flag defined, we load it from disk.
        options.keyfile && JSON.parse((0, fs_1.readFileSync)(options.keyfile, "utf-8")), options.name, options.endpoint, options.gasMultiplier);
        return {
            node,
            options,
        };
    }
    async run(uploadFunction, validateFunction) {
        var _a;
        this.logNodeInfo();
        await this.fetchPoolState();
        await this.checkVersionRequirements();
        await this.checkRuntimeRequirements();
        await this.setupNodeContract();
        await this.setupListeners();
        if (((_a = this.node) === null || _a === void 0 ? void 0 : _a.address) === this.settings.uploader) {
            if (this.keyfile) {
                if (await this.pool.paused()) {
                    logger_1.default.warn("⚠️  Pool is paused. Exiting ...");
                    process.exit();
                }
                else {
                    logger_1.default.info("📚 Running as an uploader ...");
                    this.uploader(uploadFunction, this.config);
                }
            }
            else {
                logger_1.default.error("❌ You need to specify your Arweave keyfile.");
                process.exit(1);
            }
        }
        else {
            logger_1.default.info("🧐 Running as an validator ...");
            this.validator(validateFunction, this.config);
        }
    }
    async uploader(uploadFunction, config) {
        const uploaderLogger = logger_1.default.getChildLogger({
            name: "Uploader",
        });
        const node = new rxjs_1.Observable((subscriber) => {
            // @ts-ignore
            subscriber.upload = subscriber.next;
            // @ts-ignore
            uploadFunction(subscriber, config, uploaderLogger);
        });
        node.subscribe(async (item) => {
            // Push item to buffer.
            const i = this.buffer.push(item);
            uploaderLogger.debug(`Received a new data item (${i} / ${this.metadata.bundleSize}).`);
            // Check buffer length.
            if (this.buffer.length >= this.metadata.bundleSize) {
                uploaderLogger.info("📦 Creating bundle ...");
                // Clear the buffer.
                const tempBuffer = this.buffer;
                this.buffer = [];
                // Upload buffer to Arweave.
                uploaderLogger.debug("Uploading bundle to Arweave.");
                const transaction = await this.client.createTransaction({
                    data: JSON.stringify(tempBuffer),
                });
                transaction.addTag("Application", "KYVE - Testnet");
                transaction.addTag("Pool", this.pool.address);
                transaction.addTag("@kyve/core", package_json_1.version);
                transaction.addTag(this.runtime, this.version);
                transaction.addTag("Bundle-Size", this.metadata.bundleSize);
                transaction.addTag("Content-Type", "application/json");
                await this.client.transactions.sign(transaction, this.keyfile);
                const balance = await this.client.wallets.getBalance(await this.client.wallets.getAddress(this.keyfile));
                if (+transaction.reward > +balance) {
                    uploaderLogger.error("❌ You do not have enough funds in your Arweave wallet.");
                    process.exit();
                }
                await this.client.transactions.post(transaction);
                uploaderLogger.info(`💾 Uploaded bundle to Arweave. Transaction = ${transaction.id}`);
                // Create a new vote.
                uploaderLogger.debug(`Attempting to register a bundle.`);
                try {
                    // manual gas limit for resources exhausted error
                    const registerTransaction = (await this.pool.register((0, arweave_2.toBytes)(transaction.id), +transaction.data_size, {
                        gasLimit: 10000000,
                        gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
                    }));
                    uploaderLogger.info(`⬆️  Creating a new proposal. Transaction = ${registerTransaction.hash}`);
                }
                catch (error) {
                    uploaderLogger.error("❌ Received an error while trying to register a bundle:", error);
                    process.exit(1);
                }
            }
        });
    }
    async listener() {
        const listenerLogger = logger_1.default.getChildLogger({
            name: "Listener",
        });
        return new rxjs_1.Observable((subscriber) => {
            this.pool.on("ProposalStarted", async (_transaction, _bytes) => {
                var _a;
                const transaction = (0, arweave_2.fromBytes)(_transaction);
                listenerLogger.info(`⬇️  Received a new proposal. Bundle = ${transaction}`);
                const [isValidator, paused] = await Promise.all([
                    this.pool.isValidator((_a = this.node) === null || _a === void 0 ? void 0 : _a.address),
                    this.pool.paused(),
                ]);
                if (!paused) {
                    if (isValidator) {
                        const res = await this.client.transactions.getStatus(transaction);
                        if (res.status === 200 || res.status === 202) {
                            const _data = (await this.client.transactions.getData(transaction, {
                                decode: true,
                            }));
                            const bytes = _data.byteLength;
                            const bundle = JSON.parse(new TextDecoder("utf-8", {
                                fatal: true,
                            }).decode(_data));
                            if (+_bytes === +bytes) {
                                listenerLogger.debug("Bytes match, forwarding bundle to the validate function.");
                                subscriber.next({
                                    transaction,
                                    bundle,
                                });
                            }
                            else {
                                listenerLogger.debug(`Bytes don't match (${_bytes} vs ${bytes}).`);
                                this.vote({
                                    transaction,
                                    valid: false,
                                });
                            }
                        }
                        else {
                            listenerLogger.error("❌ Error fetching bundle from Arweave.");
                        }
                    }
                    else {
                        logger_1.default.warn("⚠️  Stake not high enough to participate as validator. Skipping proposal ...");
                    }
                }
                else {
                    logger_1.default.warn("⚠️  Pool is paused. Skipping proposal ...");
                }
            });
        });
    }
    async validator(validateFunction, config) {
        const validatorLogger = logger_1.default.getChildLogger({
            name: "Validator",
        });
        const listener = await this.listener();
        const node = new rxjs_1.Observable((subscriber) => {
            // @ts-ignore
            subscriber.vote = subscriber.next;
            // @ts-ignore
            validateFunction(listener, subscriber, config, validatorLogger);
        });
        node.subscribe((item) => this.vote(item));
    }
    async vote(input) {
        const voteLogger = logger_1.default.getChildLogger({
            name: "Vote",
        });
        voteLogger.info(`🗳  Voting "${input.valid ? "valid" : "invalid"}" on bundle ${input.transaction}.`);
        try {
            await this.pool.vote((0, arweave_2.toBytes)(input.transaction), input.valid, {
                gasLimit: await this.pool.estimateGas.vote((0, arweave_2.toBytes)(input.transaction), input.valid),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
        }
        catch (error) {
            voteLogger.error("❌ Received an error while trying to vote:", error);
        }
    }
    logNodeInfo() {
        const formatInfoLogs = (input) => {
            const length = Math.max(13, this.runtime.length);
            return input.padEnd(length, " ");
        };
        logger_1.default.info(`🚀 Starting node ...\n\t${formatInfoLogs("Name")} = ${this.name}\n\t${formatInfoLogs("Address")} = ${this.wallet.address}\n\t${formatInfoLogs("Pool")} = ${this.pool.address}\n\t${formatInfoLogs("Desired Stake")} = ${this.stake} $KYVE\n\n\t${formatInfoLogs("@kyve/core")} = v${package_json_1.version}\n\t${formatInfoLogs(this.runtime)} = v${this.version}`);
    }
    async setupListeners() {
        var _a, _b, _c;
        // Listen to new contract changes.
        this.pool.on("ConfigChanged", () => {
            logger_1.default.warn("⚠️  Config changed. Exiting ...");
            process.exit();
        });
        this.pool.on("MetadataChanged", async () => {
            await this.fetchPoolState();
        });
        this.pool.on("Paused", () => {
            var _a;
            if (((_a = this.node) === null || _a === void 0 ? void 0 : _a.address) === this.settings.uploader) {
                logger_1.default.warn("⚠️  Pool is now paused. Exiting ...");
                process.exit();
            }
        });
        this.pool.on("UploaderChanged", (previous) => {
            var _a;
            if (((_a = this.node) === null || _a === void 0 ? void 0 : _a.address) === previous) {
                logger_1.default.warn("⚠️  Uploader changed. Exiting ...");
                process.exit();
            }
        });
        // Listen to new payouts.
        const payoutLogger = logger_1.default.getChildLogger({
            name: "Payout",
        });
        this.pool.on(this.pool.filters.PayedOut((_a = this.node) === null || _a === void 0 ? void 0 : _a.address), (_, _amount, _transaction) => {
            const transaction = (0, arweave_2.fromBytes)(_transaction);
            payoutLogger.info(`💸 Received a reward of ${(0, helpers_1.toHumanReadable)((0, helpers_1.toBN)(_amount))} $KYVE. Bundle = ${transaction}`);
        });
        // Listen to new points.
        const pointsLogger = logger_1.default.getChildLogger({
            name: "Points",
        });
        this.pool.on(this.pool.filters.PointsIncreased((_b = this.node) === null || _b === void 0 ? void 0 : _b.address), (_, _points, _transaction) => {
            const transaction = (0, arweave_2.fromBytes)(_transaction);
            pointsLogger.warn(`⚠️  Received a new slashing point (${_points.toString()} / ${this.settings.slashThreshold}). Bundle = ${transaction}`);
        });
        // Listen to new slashes.
        const slashLogger = logger_1.default.getChildLogger({
            name: "Slash",
        });
        this.pool.on(this.pool.filters.Slashed((_c = this.node) === null || _c === void 0 ? void 0 : _c.address), (_, _amount, _transaction) => {
            const transaction = (0, arweave_2.fromBytes)(_transaction);
            slashLogger.warn(`🚫 Node has been slashed. Lost ${(0, helpers_1.toHumanReadable)((0, helpers_1.toBN)(_amount))} $KYVE. Bundle = ${transaction}`);
            process.exit();
        });
    }
    async fetchPoolState() {
        const stateLogger = logger_1.default.getChildLogger({
            name: "PoolState",
        });
        stateLogger.debug("Attempting to fetch pool state.");
        let _poolState;
        try {
            _poolState = await this.pool.poolState();
        }
        catch (error) {
            stateLogger.error("❌ Received an error while trying to fetch the pool state:", error);
            process.exit(1);
        }
        try {
            this.config = JSON.parse(_poolState.config);
        }
        catch (error) {
            stateLogger.error("❌ Received an error while trying to parse the config:", error);
            process.exit(1);
        }
        try {
            const oldMetadata = this.metadata;
            this.metadata = JSON.parse(_poolState.metadata);
            if (oldMetadata &&
                this.metadata.versions &&
                oldMetadata.versions !== this.metadata.versions) {
                logger_1.default.warn("⚠️  Version requirements changed. Exiting ...");
                logger_1.default.info(`⏱  New version requirements are ${this.metadata.versions}.`);
                process.exit();
            }
        }
        catch (error) {
            stateLogger.error("❌ Received an error while trying to parse the metadata:", error);
            process.exit(1);
        }
        this.settings = _poolState;
        stateLogger.debug("Successfully fetched pool state.");
    }
    async checkVersionRequirements() {
        if ((0, semver_1.satisfies)(this.version, this.metadata.versions || this.version)) {
            logger_1.default.info("⏱  Pool version requirements met.");
        }
        else {
            logger_1.default.error(`❌ Running an invalid version for the specified pool. Version requirements are ${this.metadata.versions}.`);
            process.exit(1);
        }
    }
    async checkRuntimeRequirements() {
        if (this.metadata.runtime === this.runtime) {
            logger_1.default.info(`💻 Running node on runtime ${this.runtime}.`);
        }
        else {
            logger_1.default.error("❌ Specified pool does not match the integration runtime.");
            process.exit(1);
        }
    }
    async setupNodeContract() {
        let nodeAddress = await this.pool._nodeOwners(this.wallet.address);
        let parsedStake;
        let tx;
        logger_1.default.info("🌐 Joining KYVE Network ...");
        if (ethers_1.constants.AddressZero === nodeAddress) {
            try {
                tx = await this.pool.createNode(10, {
                    gasLimit: await this.pool.estimateGas.createNode(10),
                    gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
                });
                logger_1.default.debug(`Creating new contract. Transaction = ${tx.hash}`);
                await tx.wait();
                nodeAddress = await this.pool._nodeOwners(this.wallet.address);
            }
            catch (error) {
                logger_1.default.error("❌ Could not create node contract:", error);
                process.exit(1);
            }
        }
        this.node = new ethers_1.Contract(nodeAddress, node_json_1.default, this.wallet);
        logger_1.default.info(`✅ Connected to node ${nodeAddress}`);
        let nodeStake = await this.pool._stakingAmounts(nodeAddress);
        try {
            parsedStake = new bignumber_js_1.default(this.stake).multipliedBy(new bignumber_js_1.default(10).exponentiatedBy(18));
            if (parsedStake.isZero()) {
                logger_1.default.error("❌ Desired stake can't be zero.");
                process.exit(1);
            }
        }
        catch (error) {
            logger_1.default.error("❌ Provided invalid staking amount:", error);
            process.exit(1);
        }
        if (nodeStake.isZero()) {
            await this.selfDelegate(parsedStake);
        }
        else if (!(0, helpers_1.toEthersBN)(parsedStake).eq(nodeStake)) {
            await this.selfUndelegate();
            await this.selfDelegate(parsedStake);
        }
        else {
            logger_1.default.info("👌 Already staked with the correct amount.");
        }
    }
    async selfDelegate(amount) {
        var _a, _b;
        const token = await (0, helpers_1.Token)(this.pool);
        let tx;
        const balance = (0, helpers_1.toBN)((await token.balanceOf(this.wallet.address)));
        if (balance.lt(amount)) {
            logger_1.default.error("❌ Supplied wallet does not have enough $KYVE to stake.");
            process.exit(1);
        }
        try {
            tx = await token.approve(this.pool.address, (0, helpers_1.toEthersBN)(amount), {
                gasLimit: await token.estimateGas.approve(this.pool.address, (0, helpers_1.toEthersBN)(amount)),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            logger_1.default.debug(`Approving ${(0, helpers_1.toHumanReadable)(amount)} $KYVE to be spent. Transaction = ${tx.hash}`);
            await tx.wait();
            logger_1.default.info("👍 Successfully approved.");
            tx = await this.pool.delegate((_a = this.node) === null || _a === void 0 ? void 0 : _a.address, (0, helpers_1.toEthersBN)(amount), {
                gasLimit: await this.pool.estimateGas.delegate((_b = this.node) === null || _b === void 0 ? void 0 : _b.address, (0, helpers_1.toEthersBN)(amount)),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            logger_1.default.debug(`Staking ${(0, helpers_1.toHumanReadable)(amount)} $KYVE. Transaction = ${tx.hash}`);
            await tx.wait();
            logger_1.default.info("📈 Successfully staked.");
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while trying to stake:", error);
            process.exit(1);
        }
    }
    async selfUndelegate() {
        var _a, _b;
        let tx;
        try {
            tx = await this.pool.undelegate((_a = this.node) === null || _a === void 0 ? void 0 : _a.address, {
                gasLimit: await this.pool.estimateGas.undelegate((_b = this.node) === null || _b === void 0 ? void 0 : _b.address),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            logger_1.default.debug(`Unstaking. Transaction = ${tx.hash}`);
            await tx.wait();
            logger_1.default.info("📉 Successfully unstaked.");
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while trying to unstake:", error);
            process.exit(1);
        }
    }
}
exports.default = KYVE;
