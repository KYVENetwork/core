import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Contract, Wallet } from "ethers";
import { Observable } from "rxjs";
import { Logger } from "tslog";
import {
  Bundle,
  ListenFunctionReturn,
  UploadFunction,
  UploadFunctionReturn,
  ValidateFunction,
  ValidateFunctionReturn,
} from "./faces";
import { fromBytes, toBytes } from "./utils/arweave";
import Pool from "./utils/pool";

class KYVE {
  private pool: Contract;
  private wallet: Wallet;
  private keyfile: JWKInterface;
  // TODO: Figure out configuration.
  private logger = new Logger();

  private buffer: Bundle = [];
  // TODO: Listen to contract changes.
  // @ts-ignore
  private bundleSize: number;

  private client = new Arweave({
    host: "arweave.net",
    protocol: "https",
  });

  constructor(poolAddress: string, wallet: Wallet, keyfile: JWKInterface) {
    this.pool = Pool(poolAddress, wallet);
    this.wallet = wallet;
    this.keyfile = keyfile;
  }

  async run<ConfigType>(
    uploadFunction: UploadFunction<ConfigType>,
    validateFunction: ValidateFunction<ConfigType>
  ) {
    // TODO: Stake.

    const [address, uploader, _config] = await Promise.all([
      this.wallet.getAddress(),
      this.pool._uploader() as Promise<string>,
      this.pool._config() as Promise<string>,
    ]);
    const config = JSON.parse(_config);

    if (address === uploader) {
      this.uploader<ConfigType>(uploadFunction, config);
    } else {
      this.validator<ConfigType>(validateFunction, config);
    }
  }

  private async uploader<ConfigType>(
    uploadFunction: UploadFunction<ConfigType>,
    config: ConfigType
  ) {
    const node = new Observable<UploadFunctionReturn>((subscriber) => {
      uploadFunction(subscriber, config);
    });

    node.subscribe(async (item) => {
      // Push item to buffer.
      this.buffer.push(item);

      // Check buffer length.
      if (this.buffer.length >= this.bundleSize) {
        // Clear the buffer.
        const tempBuffer = this.buffer;
        this.buffer = [];

        // Upload buffer to Arweave.
        const transaction = await this.client.createTransaction({
          data: JSON.stringify(tempBuffer),
        });

        // TODO: Add node version to tag.
        transaction.addTag("Application", "KYVE - Testnet");
        transaction.addTag("Pool", this.pool.address);
        transaction.addTag("Content-Type", "application/json");

        await this.client.transactions.sign(transaction, this.keyfile);
        await this.client.transactions.post(transaction);

        // Create a new vote.
        await this.pool.register(
          toBytes(transaction.id),
          +transaction.data_size
        );
      }
    });
  }

  private async listener(): Promise<Observable<ListenFunctionReturn>> {
    return new Observable<ListenFunctionReturn>((subscriber) => {
      this.pool.on(
        "ProposalStart",
        async (
          _transactionIndexed: string,
          _transaction: string,
          _bytes: number
        ) => {
          const transaction = fromBytes(_transaction);
          const _data = (await this.client.transactions.getData(transaction, {
            decode: true,
          })) as Uint8Array;

          const bytes = _data.byteLength;
          const bundle = JSON.parse(_data.toString()) as Bundle;

          if (_bytes === bytes) {
            subscriber.next({
              transaction,
              bundle,
            });
          } else {
            await this.pool.vote(_transaction, false);
          }
        }
      );
    });
  }

  private async validator<ConfigType>(
    validateFunction: ValidateFunction<ConfigType>,
    config: ConfigType
  ) {
    const listener = await this.listener();

    const node = new Observable<ValidateFunctionReturn>((subscriber) => {
      validateFunction(listener, subscriber, config);
    });

    node.subscribe((item) => {
      this.pool.vote(toBytes(item.transaction), item.valid);
    });
  }
}

export default KYVE;
