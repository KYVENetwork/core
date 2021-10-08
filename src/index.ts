import { Contract, Wallet } from "ethers";
import { Observable } from "rxjs";
import { Logger } from "tslog";
import {
  ListenFunctionReturn,
  UploadFunction,
  UploadFunctionReturn,
  ValidateFunction,
  ValidateFunctionReturn,
} from "./faces";
import Pool from "./utils/pool";

class KYVE {
  private pool: Contract;
  private wallet: Wallet;
  // TODO: Figure out configuration.
  private logger = new Logger();

  constructor(poolAddress: string, wallet: Wallet) {
    this.pool = Pool(poolAddress, wallet);
    this.wallet = wallet;
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

    node.subscribe((item) => {
      // - Push item to buffer.
      // - If buffer is bigger than bundleSize, push to Arweave.
      // - And create a new vote.
    });
  }

  private async listener(): Promise<Observable<ListenFunctionReturn>> {
    // TODO
    return new Observable<ListenFunctionReturn>();
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
      // TODO
    });
  }
}

export default KYVE;
