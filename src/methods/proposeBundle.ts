import { Node } from "..";
import { KYVE_NO_DATA_BUNDLE } from "../utils/constants";
import hash from "object-hash";
import { sleep } from "../utils";

export async function proposeBundle(this: Node): Promise<void> {
  const fromHeight =
    +this.pool.bundle_proposal!.to_height || +this.pool.current_height;
  const toHeight = +this.pool.max_bundle_size + fromHeight;
  const fromKey = this.pool.bundle_proposal!.to_key || this.pool.current_key;

  this.logger.debug(`Loading bundle from cache to create bundle proposal`);

  const bundleProposal = await this.loadBundle(fromHeight, toHeight);

  if (bundleProposal.bundle.length) {
    try {
      // upload bundle to Arweave
      this.logger.info(
        `Created bundle of length ${bundleProposal.bundle.length}`
      );
      this.logger.debug(
        `Compressing bundle with compression type ${this.compression.name}`
      );

      const bundleCompressed = await this.compression.compress(
        bundleProposal.bundle
      );
      const bundleHash = hash(bundleCompressed);

      const tags: [string, string][] = [
        ["Application", "KYVE"],
        ["Network", this.network],
        ["Pool", this.poolId.toString()],
        ["@kyve/core", this.coreVersion],
        [this.runtime.name, this.runtime.version],
        ["Uploader", this.client.account.address],
        ["FromHeight", fromHeight.toString()],
        ["ToHeight", (fromHeight + bundleProposal.bundle.length).toString()],
        ["Size", bundleProposal.bundle.length.toString()],
        ["FromKey", fromKey],
        ["ToKey", bundleProposal.toKey],
        ["Value", bundleProposal.toValue],
      ];

      this.logger.debug(`Attempting to save bundle on storage provider`);

      const storageId = await this.storageProvider.saveBundle(
        bundleCompressed,
        tags
      );

      this.logger.info(
        `Saved bundle on ${this.storageProvider.name} with Storage Id "${storageId}"\n`
      );

      await this.submitBundleProposal(
        storageId,
        bundleCompressed.byteLength,
        fromHeight,
        fromHeight + bundleProposal.bundle.length,
        fromKey,
        bundleProposal.toKey,
        bundleProposal.toValue,
        bundleHash
      );
    } catch (error) {
      this.logger.warn(
        ` Failed to save bundle on ${this.storageProvider.name}`
      );
      this.logger.debug(error);

      await sleep(10 * 1000);
    }
  } else {
    this.logger.info(
      `Creating new bundle proposal of type ${KYVE_NO_DATA_BUNDLE}`
    );

    const storageId = `KYVE_NO_DATA_BUNDLE_${this.poolId}_${Math.floor(
      Date.now() / 1000
    )}`;

    await this.submitBundleProposal(
      storageId,
      0,
      fromHeight,
      fromHeight,
      fromKey,
      "",
      "",
      ""
    );
  }
}
