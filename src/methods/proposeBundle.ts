import KyveCore from "..";
import { KYVE_NO_DATA_BUNDLE } from "../utils/constants";

export async function proposeBundle(this: KyveCore): Promise<void> {
  const fromHeight =
    +this.pool.bundle_proposal!.to_height || +this.pool.current_height;
  const toHeight = +this.pool.max_bundle_size + fromHeight;
  const fromKey = this.pool.bundle_proposal!.to_key || this.pool.current_key;

  const bundleProposal = await this.loadBundle(fromHeight, toHeight);

  if (bundleProposal.bundle.length) {
    // upload bundle to Arweave
    const bundleCompressed = await this.compression.compress(
      bundleProposal.bundle
    );

    const tags: [string, string][] = [
      ["Application", "KYVE"],
      ["Network", this.network],
      ["Pool", this.poolId.toString()],
      ["@kyve/core", this.coreVersion],
      [this.runtime.name, this.runtime.version],
      ["Uploader", this.client.account.address],
      ["FromHeight", fromHeight.toString()],
      ["ToHeight", bundleProposal.toHeight.toString()],
      ["FromKey", fromKey],
      ["ToKey", bundleProposal.toKey],
      ["Value", bundleProposal.toValue],
    ];

    try {
      const bundleId = await this.storageProvider.saveBundle(
        bundleCompressed,
        tags
      );
      this.logger.info(
        `Saved bundle on ${this.storageProvider.name} with ID ${bundleId}`
      );

      await this.submitBundleProposal(
        bundleId,
        bundleCompressed.byteLength,
        fromHeight,
        bundleProposal.toHeight,
        fromKey,
        bundleProposal.toKey,
        bundleProposal.toValue
      );
    } catch {
      this.logger.warn(
        ` Failed to save bundle on ${this.storageProvider.name}`
      );
    }
  } else {
    this.logger.info(
      `Creating new bundle proposal of type ${KYVE_NO_DATA_BUNDLE}`
    );

    const bundleId = `KYVE_NO_DATA_BUNDLE_${this.poolId}_${Math.floor(
      Date.now() / 1000
    )}`;

    await this.submitBundleProposal(
      bundleId,
      0,
      fromHeight,
      fromHeight,
      fromKey,
      "",
      ""
    );
  }
}
