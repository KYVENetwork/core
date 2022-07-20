import { Bundle, Node } from "..";
import { KYVE_NO_DATA_BUNDLE } from "../utils/constants";
import { sleep, standardizeJSON, sha256 } from "../utils";

export async function proposeBundle(
  this: Node,
  createdAt: number
): Promise<void> {
  const fromHeight =
    +this.pool.bundle_proposal!.to_height || +this.pool.current_height;
  const toHeight = +this.pool.max_bundle_size + fromHeight;
  const fromKey = this.pool.bundle_proposal!.to_key || this.pool.current_key;

  let storageId: string;
  let bundleProposal: Bundle;
  let bundleCompressed: Buffer;

  while (true) {
    await this.syncPoolState();

    if (+this.pool.bundle_proposal!.created_at > createdAt) {
      // check if new proposal is available in the meantime
      return;
    } else if (this.shouldIdle()) {
      // check if pool got paused in the meantime
      return;
    }

    this.logger.debug(`Loading bundle from cache to create bundle proposal`);

    bundleProposal = await this.loadBundle(fromHeight, toHeight);

    if (!bundleProposal.bundle.length) {
      break;
    }

    try {
      // upload bundle to Arweave
      this.logger.info(
        `Created bundle of length ${bundleProposal.bundle.length}`
      );
      this.logger.debug(
        `Compressing bundle with compression type ${this.compression.name}`
      );

      bundleCompressed = await this.compression.compress(bundleProposal.bundle);

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

      storageId = await this.storageProvider.saveBundle(bundleCompressed, tags);

      this.logger.info(
        `Saved bundle on ${this.storageProvider.name} with Storage Id "${storageId}"\n`
      );

      break;
    } catch (error) {
      this.logger.warn(
        ` Failed to save bundle on ${this.storageProvider.name}. Retrying in 10s ...`
      );
      this.logger.debug(error);
      await sleep(10 * 1000);
    }
  }

  while (true) {
    await this.syncPoolState();

    if (+this.pool.bundle_proposal!.created_at > createdAt) {
      // check if new proposal is available in the meantime
      return;
    } else if (this.shouldIdle()) {
      // check if pool got paused in the meantime
      return;
    }

    if (storageId!) {
      const bundleHash = sha256(standardizeJSON(bundleProposal.bundle));

      const isSubmitted = await this.submitBundleProposal(
        storageId,
        bundleCompressed!.byteLength,
        fromHeight,
        fromHeight + bundleProposal.bundle.length,
        fromKey,
        bundleProposal.toKey,
        bundleProposal.toValue,
        bundleHash
      );

      if (isSubmitted) {
        break;
      }
    } else {
      this.logger.info(
        `Creating new bundle proposal of type ${KYVE_NO_DATA_BUNDLE}`
      );

      storageId = `KYVE_NO_DATA_BUNDLE_${this.poolId}_${Math.floor(
        Date.now() / 1000
      )}`;

      const isSubmitted = await this.submitBundleProposal(
        storageId,
        0,
        fromHeight,
        fromHeight,
        fromKey,
        "",
        "",
        ""
      );

      if (isSubmitted) {
        break;
      }
    }
  }
}
