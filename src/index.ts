import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import BigNumber from "bignumber.js";
import { OptionValues } from "commander";
import {
  Contract,
  ContractTransaction,
  ethers,
  constants,
  Wallet,
} from "ethers";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import Prando from "prando";
import { Observable } from "rxjs";
import { satisfies } from "semver";
import { ILogObject } from "tslog";
import {
  adjectives,
  starWars,
  uniqueNamesGenerator,
} from "unique-names-generator";
import {
  Bundle,
  ListenFunctionReturn,
  UploadFunction,
  UploadFunctionReturn,
  ValidateFunction,
  ValidateFunctionReturn,
} from "./faces";
import { CLI } from "./utils";
import { fromBytes, toBytes } from "./utils/arweave";
import logger from "./utils/logger";
import {
  getGasPrice,
  toBN,
  toEthersBN,
  toHumanReadable,
  Pool,
  Token,
} from "./utils/helpers";
import NodeABI from "./abi/node.json";
import { version } from "../package.json";

export * from "./utils";

class KYVE {
  private pool: Contract;
  private node: Contract | null;
  private runtime: string;
  private version: string;
  private stake: string;
  private wallet: Wallet;
  private keyfile?: JWKInterface;
  private name: string;
  private gasMultiplier: string;

  private buffer: Bundle = [];
  private metadata: any;
  private settings: any;
  private config: any;

  private client = new Arweave({
    host: "arweave.net",
    protocol: "https",
  });

  constructor(
    poolAddress: string,
    runtime: string,
    version: string,
    stakeAmount: string,
    privateKey: string,
    keyfile?: JWKInterface,
    name?: string,
    endpoint?: string,
    gasMultiplier: string = "1"
  ) {
    const provider = new ethers.providers.WebSocketProvider(
      endpoint || "wss://moonbeam-alpha.api.onfinality.io/public-ws",
      {
        chainId: 1287,
        name: "moonbase-alphanet",
      }
    );
    provider._websocket.on("ping", () => {
      logger.debug("Received ping ...");
      provider._websocket.pong();
    });

    this.wallet = new Wallet(privateKey, provider);

    this.pool = Pool(poolAddress, this.wallet);
    this.node = null;
    this.runtime = runtime;
    this.version = version;
    this.stake = stakeAmount;
    this.keyfile = keyfile;
    this.gasMultiplier = gasMultiplier;

    if (name) {
      this.name = name;
    } else {
      const r = new Prando(this.wallet.address + this.pool.address);

      this.name = uniqueNamesGenerator({
        dictionaries: [adjectives, starWars],
        separator: "-",
        length: 2,
        style: "lowerCase",
        seed: r.nextInt(0, adjectives.length * starWars.length),
      }).replace(" ", "-");
    }

    if (!existsSync("./logs")) {
      mkdirSync("./logs");
    }

    const logToTransport = (log: ILogObject) => {
      appendFileSync(`./logs/${this.name}.txt`, JSON.stringify(log) + "\n");
    };

    logger.attachTransport({
      silly: logToTransport,
      debug: logToTransport,
      trace: logToTransport,
      info: logToTransport,
      warn: logToTransport,
      error: logToTransport,
      fatal: logToTransport,
    });
  }

  static async generate(
    cli?: CLI
  ): Promise<{ node: KYVE; options: OptionValues }> {
    if (!cli) {
      cli = new CLI(process.env.KYVE_RUNTIME!, process.env.KYVE_VERSION!);
    }
    await cli.parseAsync();
    const options = cli.opts();

    const node = new KYVE(
      options.pool,
      cli.runtime,
      cli.packageVersion,
      options.stake,
      options.privateKey,
      // if there is a keyfile flag defined, we load it from disk.
      options.keyfile && JSON.parse(readFileSync(options.keyfile, "utf-8")),
      options.name,
      options.endpoint,
      options.gasMultiplier
    );

    return {
      node,
      options,
    };
  }

  async run<ConfigType>(
    uploadFunction: UploadFunction<ConfigType>,
    validateFunction: ValidateFunction<ConfigType>
  ) {
    this.logNodeInfo();

    await this.fetchPoolState();

    await this.checkVersionRequirements();
    await this.checkRuntimeRequirements();

    await this.setupNodeContract();
    await this.setupListeners();

    if (this.node?.address === this.settings.uploader) {
      if (this.keyfile) {
        if (await this.pool.paused()) {
          logger.warn("⚠️  Pool is paused. Exiting ...");
          process.exit();
        } else {
          logger.info("📚 Running as an uploader ...");
          this.uploader<ConfigType>(uploadFunction, this.config);
        }
      } else {
        logger.error("❌ You need to specify your Arweave keyfile.");
        process.exit(1);
      }
    } else {
      logger.info("🧐 Running as an validator ...");
      this.validator<ConfigType>(validateFunction, this.config);
    }
  }

  private async uploader<ConfigType>(
    uploadFunction: UploadFunction<ConfigType>,
    config: ConfigType
  ) {
    const uploaderLogger = logger.getChildLogger({
      name: "Uploader",
    });

    const node = new Observable<UploadFunctionReturn>((subscriber) => {
      // @ts-ignore
      subscriber.upload = subscriber.next;
      // @ts-ignore
      uploadFunction(subscriber, config, uploaderLogger);
    });

    node.subscribe(async (item) => {
      // Push item to buffer.
      const i = this.buffer.push(item);
      uploaderLogger.debug(
        `Received a new data item (${i} / ${this.metadata.bundleSize}).`
      );

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
        transaction.addTag("@kyve/core", version);
        transaction.addTag(this.runtime, this.version);
        transaction.addTag("Bundle-Size", this.metadata.bundleSize);
        transaction.addTag("Content-Type", "application/json");

        await this.client.transactions.sign(transaction, this.keyfile);

        const balance = await this.client.wallets.getBalance(
          await this.client.wallets.getAddress(this.keyfile)
        );
        if (+transaction.reward > +balance) {
          uploaderLogger.error(
            "❌ You do not have enough funds in your Arweave wallet."
          );
          process.exit();
        }

        await this.client.transactions.post(transaction);

        uploaderLogger.info(
          `💾 Uploaded bundle to Arweave. Transaction = ${transaction.id}`
        );

        // Create a new vote.
        uploaderLogger.debug(`Attempting to register a bundle.`);

        try {
          // manual gas limit for resources exhausted error
          const registerTransaction = (await this.pool.register(
            toBytes(transaction.id),
            +transaction.data_size,
            {
              gasLimit: 10000000,
              gasPrice: await getGasPrice(this.pool, this.gasMultiplier),
            }
          )) as ContractTransaction;

          uploaderLogger.info(
            `⬆️  Creating a new proposal. Transaction = ${registerTransaction.hash}`
          );
        } catch (error) {
          uploaderLogger.error(
            "❌ Received an error while trying to register a bundle:",
            error
          );
          process.exit(1);
        }
      }
    });
  }

  private async listener(): Promise<Observable<ListenFunctionReturn>> {
    const listenerLogger = logger.getChildLogger({
      name: "Listener",
    });

    return new Observable<ListenFunctionReturn>((subscriber) => {
      this.pool.on(
        "ProposalStarted",
        async (_transaction: string, _bytes: number) => {
          const transaction = fromBytes(_transaction);
          listenerLogger.info(
            `⬇️  Received a new proposal. Bundle = ${transaction}`
          );

          const [isValidator, paused] = await Promise.all([
            this.pool.isValidator(this.node?.address),
            this.pool.paused(),
          ]);

          if (!paused) {
            if (isValidator) {
              const res = await this.client.transactions.getStatus(transaction);
              if (res.status === 200 || res.status === 202) {
                const _data = (await this.client.transactions.getData(
                  transaction,
                  {
                    decode: true,
                  }
                )) as Uint8Array;
                const bytes = _data.byteLength;
                const bundle = JSON.parse(
                  new TextDecoder("utf-8", {
                    fatal: true,
                  }).decode(_data)
                ) as Bundle;

                if (+_bytes === +bytes) {
                  listenerLogger.debug(
                    "Bytes match, forwarding bundle to the validate function."
                  );

                  subscriber.next({
                    transaction,
                    bundle,
                  });
                } else {
                  listenerLogger.debug(
                    `Bytes don't match (${_bytes} vs ${bytes}).`
                  );

                  this.vote({
                    transaction,
                    valid: false,
                  });
                }
              } else {
                listenerLogger.error("❌ Error fetching bundle from Arweave.");
              }
            } else {
              logger.warn(
                "⚠️  Stake not high enough to participate as validator. Skipping proposal ..."
              );
            }
          } else {
            logger.warn("⚠️  Pool is paused. Skipping proposal ...");
          }
        }
      );
    });
  }

  private async validator<ConfigType>(
    validateFunction: ValidateFunction<ConfigType>,
    config: ConfigType
  ) {
    const validatorLogger = logger.getChildLogger({
      name: "Validator",
    });

    const listener = await this.listener();

    const node = new Observable<ValidateFunctionReturn>((subscriber) => {
      // @ts-ignore
      subscriber.vote = subscriber.next;
      // @ts-ignore
      validateFunction(listener, subscriber, config, validatorLogger);
    });

    node.subscribe((item) => this.vote(item));
  }

  private async vote(input: ValidateFunctionReturn) {
    const voteLogger = logger.getChildLogger({
      name: "Vote",
    });

    voteLogger.info(
      `🗳  Voting "${input.valid ? "valid" : "invalid"}" on bundle ${
        input.transaction
      }.`
    );

    try {
      await this.pool.vote(toBytes(input.transaction), input.valid, {
        gasLimit: await this.pool.estimateGas.vote(
          toBytes(input.transaction),
          input.valid
        ),
        gasPrice: await getGasPrice(this.pool, this.gasMultiplier),
      });
    } catch (error) {
      voteLogger.error("❌ Received an error while trying to vote:", error);
    }
  }

  private logNodeInfo() {
    const formatInfoLogs = (input: string) => {
      const length = Math.max(13, this.runtime.length);
      return input.padEnd(length, " ");
    };

    logger.info(
      `🚀 Starting node ...\n\t${formatInfoLogs("Name")} = ${
        this.name
      }\n\t${formatInfoLogs("Address")} = ${
        this.wallet.address
      }\n\t${formatInfoLogs("Pool")} = ${this.pool.address}\n\t${formatInfoLogs(
        "Desired Stake"
      )} = ${this.stake} $KYVE\n\n\t${formatInfoLogs(
        "@kyve/core"
      )} = v${version}\n\t${formatInfoLogs(this.runtime)} = v${this.version}`
    );
  }

  private async setupListeners() {
    // Listen to new contract changes.
    this.pool.on("ConfigChanged", () => {
      logger.warn("⚠️  Config changed. Exiting ...");
      process.exit();
    });
    this.pool.on("MetadataChanged", async () => {
      await this.fetchPoolState();
    });
    this.pool.on("Paused", () => {
      if (this.node?.address === this.settings.uploader) {
        logger.warn("⚠️  Pool is now paused. Exiting ...");
        process.exit();
      }
    });
    this.pool.on("UploaderChanged", (previous: string) => {
      if (this.node?.address === previous) {
        logger.warn("⚠️  Uploader changed. Exiting ...");
        process.exit();
      }
    });

    // Listen to new payouts.
    const payoutLogger = logger.getChildLogger({
      name: "Payout",
    });

    this.pool.on(
      this.pool.filters.PayedOut(this.node?.address),
      (_, _amount: ethers.BigNumber, _transaction: string) => {
        const transaction = fromBytes(_transaction);

        payoutLogger.info(
          `💸 Received a reward of ${toHumanReadable(
            toBN(_amount)
          )} $KYVE. Bundle = ${transaction}`
        );
      }
    );

    // Listen to new points.
    const pointsLogger = logger.getChildLogger({
      name: "Points",
    });

    this.pool.on(
      this.pool.filters.PointsIncreased(this.node?.address),
      (_, _points: ethers.BigNumber, _transaction: string) => {
        const transaction = fromBytes(_transaction);

        pointsLogger.warn(
          `⚠️  Received a new slashing point (${_points.toString()} / ${
            this.settings.slashThreshold
          }). Bundle = ${transaction}`
        );
      }
    );

    // Listen to new slashes.
    const slashLogger = logger.getChildLogger({
      name: "Slash",
    });

    this.pool.on(
      this.pool.filters.Slashed(this.node?.address),
      (_, _amount: ethers.BigNumber, _transaction: string) => {
        const transaction = fromBytes(_transaction);

        slashLogger.warn(
          `🚫 Node has been slashed. Lost ${toHumanReadable(
            toBN(_amount)
          )} $KYVE. Bundle = ${transaction}`
        );
        process.exit();
      }
    );
  }

  private async fetchPoolState() {
    const stateLogger = logger.getChildLogger({
      name: "PoolState",
    });

    stateLogger.debug("Attempting to fetch pool state.");

    let _poolState;

    try {
      _poolState = await this.pool.poolState();
    } catch (error) {
      stateLogger.error(
        "❌ Received an error while trying to fetch the pool state:",
        error
      );
      process.exit(1);
    }

    try {
      this.config = JSON.parse(_poolState.config);
    } catch (error) {
      stateLogger.error(
        "❌ Received an error while trying to parse the config:",
        error
      );
      process.exit(1);
    }

    try {
      const oldMetadata = this.metadata;
      this.metadata = JSON.parse(_poolState.metadata);

      if (
        oldMetadata &&
        this.metadata.versions &&
        oldMetadata.versions !== this.metadata.versions
      ) {
        logger.warn("⚠️  Version requirements changed. Exiting ...");
        logger.info(
          `⏱  New version requirements are ${this.metadata.versions}.`
        );
        process.exit();
      }
    } catch (error) {
      stateLogger.error(
        "❌ Received an error while trying to parse the metadata:",
        error
      );
      process.exit(1);
    }

    this.settings = _poolState;

    stateLogger.debug("Successfully fetched pool state.");
  }

  private async checkVersionRequirements() {
    if (satisfies(this.version, this.metadata.versions || this.version)) {
      logger.info("⏱  Pool version requirements met.");
    } else {
      logger.error(
        `❌ Running an invalid version for the specified pool. Version requirements are ${this.metadata.versions}.`
      );
      process.exit(1);
    }
  }

  private async checkRuntimeRequirements() {
    if (this.metadata.runtime === this.runtime) {
      logger.info(`💻 Running node on runtime ${this.runtime}.`);
    } else {
      logger.error("❌ Specified pool does not match the integration runtime.");
      process.exit(1);
    }
  }

  private async setupNodeContract() {
    let nodeAddress = await this.pool._nodeOwners(this.wallet.address);
    let parsedStake;

    let tx: ContractTransaction;

    logger.info("🌐 Joining KYVE Network ...");

    if (constants.AddressZero === nodeAddress) {
      try {
        tx = await this.pool.createNode(10, {
          gasLimit: await this.pool.estimateGas.createNode(10),
          gasPrice: await getGasPrice(this.pool, this.gasMultiplier),
        });

        logger.debug(`Creating new contract. Transaction = ${tx.hash}`);

        await tx.wait();

        nodeAddress = await this.pool._nodeOwners(this.wallet.address);
      } catch (error) {
        logger.error("❌ Could not create node contract:", error);
        process.exit(1);
      }
    }

    this.node = new Contract(nodeAddress, NodeABI, this.wallet);

    logger.info(`✅ Connected to node ${nodeAddress}`);

    let nodeStake = await this.pool._stakingAmounts(nodeAddress);

    try {
      parsedStake = new BigNumber(this.stake).multipliedBy(
        new BigNumber(10).exponentiatedBy(18)
      );

      if (parsedStake.isZero()) {
        logger.error("❌ Desired stake can't be zero.");
        process.exit(1);
      }
    } catch (error) {
      logger.error("❌ Provided invalid staking amount:", error);
      process.exit(1);
    }

    if (nodeStake.isZero()) {
      await this.selfDelegate(parsedStake);
    } else if (!toEthersBN(parsedStake).eq(nodeStake)) {
      await this.selfUndelegate();
      await this.selfDelegate(parsedStake);
    } else {
      logger.info("👌 Already staked with the correct amount.");
    }
  }

  private async selfDelegate(amount: BigNumber) {
    const token = await Token(this.pool);
    let tx: ContractTransaction;

    const balance = toBN(
      (await token.balanceOf(this.wallet.address)) as ethers.BigNumber
    );

    if (balance.lt(amount)) {
      logger.error("❌ Supplied wallet does not have enough $KYVE to stake.");
      process.exit(1);
    }

    try {
      tx = await token.approve(this.pool.address, toEthersBN(amount), {
        gasLimit: await token.estimateGas.approve(
          this.pool.address,
          toEthersBN(amount)
        ),
        gasPrice: await getGasPrice(this.pool, this.gasMultiplier),
      });
      logger.debug(
        `Approving ${toHumanReadable(
          amount
        )} $KYVE to be spent. Transaction = ${tx.hash}`
      );

      await tx.wait();
      logger.info("👍 Successfully approved.");

      tx = await this.pool.delegate(this.node?.address, toEthersBN(amount), {
        gasLimit: await this.pool.estimateGas.delegate(
          this.node?.address,
          toEthersBN(amount)
        ),
        gasPrice: await getGasPrice(this.pool, this.gasMultiplier),
      });
      logger.debug(
        `Staking ${toHumanReadable(amount)} $KYVE. Transaction = ${tx.hash}`
      );

      await tx.wait();
      logger.info("📈 Successfully staked.");
    } catch (error) {
      logger.error("❌ Received an error while trying to stake:", error);
      process.exit(1);
    }
  }

  private async selfUndelegate() {
    let tx: ContractTransaction;

    try {
      tx = await this.pool.undelegate(this.node?.address, {
        gasLimit: await this.pool.estimateGas.undelegate(this.node?.address),
        gasPrice: await getGasPrice(this.pool, this.gasMultiplier),
      });
      logger.debug(`Unstaking. Transaction = ${tx.hash}`);

      await tx.wait();
      logger.info("📉 Successfully unstaked.");
    } catch (error) {
      logger.error("❌ Received an error while trying to unstake:", error);
      process.exit(1);
    }
  }
}

export default KYVE;
