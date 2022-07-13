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

Everybody can create a custom integration. For that it is highly recommended to use this package to ensure no unexpected behaviour occurs.

## Installation

```
yarn add @kyve/core
```

## Implement interface IRuntime

The interface `IRuntime` defines how a runtime needs to be implemented. It has three main methods which need to be implemented. Explanations in detail can be found on the interface itself in the form of comments (`src/types/interfaces.ts`).

An example implementation of the EVM runtime can be found here:

```ts
import { DataItem, IRuntime, Node } from "@kyve/core";
import { providers } from "ethers";

export default class EVM implements IRuntime {
  public name = "@kyve/evm";
  public version = "1.0.0";

  // get block with transactions by height
  public async getDataItem(core: Node, key: string): Promise<DataItem> {
    try {
      // setup web3 provider
      const provider = new providers.StaticJsonRpcProvider({
        url: core.poolConfig.rpc,
      });

      // fetch data item
      const value = await provider.getBlockWithTransactions(+key);

      // throw if data item is not available
      if (!value) throw new Error();

      // Delete the number of confirmations from a transaction to keep data deterministic.
      value.transactions.forEach(
        (tx: Partial<providers.TransactionResponse>) => delete tx.confirmations
      );

      return {
        key,
        value,
      };
    } catch (error) {
      throw error;
    }
  }

  // increment block height by 1
  public async getNextKey(key: string): Promise<string> {
    return (parseInt(key) + 1).toString();
  }

  // save only the hash of a block on KYVE chain
  public async formatValue(value: any): Promise<string> {
    return value.hash;
  }
}
```

## Build your custom integration

Having the runtime implemented the final steps now are choosing suitable prebuild
modules for your integration. There are three core features which need to be defined:

### Storage Provider

The storage provider is basically the harddrive of KYVE. It saves all the data a bundle has and should be web 3 by nature. Current supported storage providers are:

- [Arweave](https://arweave.net) (recommended)

### Compression

The compression type should also be chosen carefully. Each bundle saved on the storage provider gets compressed and decompressed by this algorithm. Current supported compression types are:

- NoCompression
- Gzip (recommended)

### Cache

The cache of an integration is responsible for precaching data, making data archival much faster. Current supported caches are:

- JsonFileCache (recommended)

After settling on certain modules the integration can just be built together and started. An example from the EVM integration can be found here:

```ts
import { Node, Arweave, Gzip, JsonFileCache } from "@kyve/core";

import EVM from "./runtime";

new Node()
  .addRuntime(new EVM())
  .addStorageProvider(new Arweave())
  .addCompression(new Gzip())
  .addCache(new JsonFileCache())
  .start();
```

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
