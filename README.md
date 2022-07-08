<p align="center">
  <a href="https://kyve.network">
    <img src="https://user-images.githubusercontent.com/62398724/137493477-63868209-a19b-4efa-9413-f06d41197d6d.png" style="border-radius: 50%" height="96">
  </a>
  <h3 align="center"><code>@kyve/core</code></h3>
  <p align="center">🚀 The base KYVE node implementation.</p>
</p>

# Integrations

In order to archive data with KYVE protocol nodes have to run on a storage pool. Every protocol node runs on a runtime which defines how data is being retrieved and how data is being validated. A runtime is just the execution environment for a integration.

## Creating a custom integration

### Installation

```
yarn add @kyve/core
```

### Implement interface IRuntime

The interface `IRuntime` defines how a runtime needs to be implemented. It has three main methods which need to be implemented. Explanations in detail can be found on the interface itself in the form of comments (`src/types/interfaces.ts`).

#### Example EVM integration

```ts
import KYVE from "@kyve/core";
import { providers } from "ethers";
import { version } from "../package.json";

process.env.KYVE_RUNTIME = "@kyve/evm";
process.env.KYVE_VERSION = version;

KYVE.metrics.register.setDefaultLabels({
  app: process.env.KYVE_RUNTIME,
});

class EVM extends KYVE {
  // pull data item from source
  public async getDataItem(key: number): Promise<{ key: number; value: any }> {
    let provider;
    let block;

    // setup provider for evm chain
    try {
      provider = new providers.StaticJsonRpcProvider(this.pool.config.rpc);
    } catch (err) {
      this.logger.warn(
        `⚠️  EXTERNAL ERROR: Failed to connect with rpc: ${this.pool.config.rpc}. Retrying ...`
      );
      // forward error to core
      throw err;
    }

    // fetch block with transactions at requested height
    try {
      block = await provider?.getBlockWithTransactions(key)!;

      // delete transaction confirmations from block since they are not deterministic
      block.transactions.forEach(
        (transaction: Partial<providers.TransactionResponse>) =>
          delete transaction.confirmations
      );
    } catch (err) {
      this.logger.warn(
        `⚠️  EXTERNAL ERROR: Failed to fetch data item from source at height ${key}. Retrying ...`
      );
      // forward error to core
      throw err;
    }

    return {
      key,
      value: block,
    };
  }

  // validate the data item uploaded by a node
  public async validate(
    localBundle: any[],
    localBytes: number,
    uploadBundle: any[],
    uploadBytes: number
  ): Promise<boolean> {
    // default validate consists of a simple hash comparison
    return super.validate(localBundle, localBytes, uploadBundle, uploadBytes);
  }
}

new EVM().start();
```

### Querying data

> Coming soon!

## Contributing

To contribute to this repository please follow these steps:

1.  Clone the repository
    ```
    git clone git@github.com:KYVENetwork/core.git
    ```
2.  Install dependencies
    ```
    yarn install
    ```
