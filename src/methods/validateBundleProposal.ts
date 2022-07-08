import { Node } from "..";
import { sleep } from "../utils";
import { VOTE } from "../utils/constants";
import { DataItem } from "../types";
import hash from "object-hash";

// TODO: exit after remaining upload interval if node is uploader
export async function validateBundleProposal(
  this: Node,
  createdAt: number
): Promise<void> {
  this.logger.info(
    `Validating bundle "${this.pool.bundle_proposal!.storage_id}"`
  );

  let hasVotedAbstain = this.pool.bundle_proposal?.voters_abstain.includes(
    this.client.account.address
  );

  let proposedBundle: DataItem[] = [];
  let proposedBundleCompressed: Buffer;

  let validationBundle: DataItem[] = [];
  let validationBundleCompressed: Buffer;

  while (true) {
    await this.syncPoolState();

    if (+this.pool.bundle_proposal!.created_at > createdAt) {
      // check if new proposal is available in the meantime
      return;
    } else if (this.shouldIdle()) {
      // check if pool got paused in the meantime
      return;
    }

    // try to download bundle from arweave
    if (!proposedBundleCompressed!) {
      this.logger.debug(
        `Attempting to download bundle from ${this.storageProvider.name}`
      );

      try {
        proposedBundleCompressed = await this.storageProvider.retrieveBundle(
          this.pool.bundle_proposal!.storage_id
        );
      } catch (error) {
        this.logger.warn(
          ` Failed to retrieve bundle from ${this.storageProvider.name}. Retrying in 10s ...\n`
        );
        this.logger.debug(error);

        await sleep(10 * 1000);
        continue;
      }

      if (proposedBundleCompressed!) {
        this.logger.info(
          `Successfully downloaded bundle from ${this.storageProvider.name}`
        );

        try {
          proposedBundle = await this.compression.decompress(
            proposedBundleCompressed
          );
          this.logger.info(
            `Successfully decompressed bundle with compression type ${this.compression.name}`
          );
        } catch (error) {
          this.logger.info(
            `Could not decompress bundle with compression type ${this.compression.name}`
          );
        }
      } else {
        this.logger.info(
          `Could not download bundle from ${this.storageProvider.name}. Retrying in 10s ...`
        );

        if (!hasVotedAbstain) {
          await this.voteBundleProposal(
            this.pool.bundle_proposal!.storage_id,
            VOTE.ABSTAIN
          );
          hasVotedAbstain = true;
        }

        await sleep(10 * 1000);
        continue;
      }
    }

    // try to load local bundle
    const currentHeight = +this.pool.current_height;
    const toHeight = +this.pool.bundle_proposal!.to_height || currentHeight;

    this.logger.debug(
      `Attemping to load local bundle from ${currentHeight} to ${toHeight} ...`
    );

    const { bundle } = await this.loadBundle(currentHeight, toHeight);

    // check if bundle length is equal to request bundle
    if (bundle.length === toHeight - currentHeight) {
      validationBundle = bundle;
      validationBundleCompressed = await this.compression.compress(
        validationBundle
      );

      this.logger.info(
        `Successfully loaded local bundle from ${currentHeight} to ${toHeight}\n`
      );

      break;
    } else {
      this.logger.info(
        `Could not load local bundle from ${currentHeight} to ${toHeight}. Retrying in 10s ...`
      );

      if (!hasVotedAbstain) {
        await this.voteBundleProposal(
          this.pool.bundle_proposal!.storage_id,
          VOTE.ABSTAIN
        );
        hasVotedAbstain = true;
      }

      await sleep(10 * 1000);
      continue;
    }
  }

  try {
    const uploadedKey = proposedBundle!.at(-1)?.key ?? "";
    const proposedKey = this.pool.bundle_proposal!.to_key;
    const validationKey = validationBundle!.at(-1)?.key ?? "";

    const uploadedValue = await this.runtime.formatValue(
      proposedBundle!.at(-1)?.value ?? ""
    );
    const proposedValue = this.pool.bundle_proposal!.to_value;
    const validationValue = await this.runtime.formatValue(
      validationBundle!.at(-1)?.value ?? ""
    );

    const uploadedByteSize = proposedBundleCompressed.byteLength;
    const proposedByteSize = +this.pool.bundle_proposal!.byte_size;
    const validationByteSize = validationBundleCompressed.byteLength;

    const uploadedBundleHash = hash(proposedBundleCompressed);
    const proposedBundleHash = this.pool.bundle_proposal!.bundle_hash;
    const validationBundleHash = hash(validationBundleCompressed);

    this.logger.debug(`Validating bundle proposal by key and value`);
    this.logger.debug(`Uploaded:     ${uploadedKey} ${uploadedValue}`);
    this.logger.debug(`Proposed:     ${proposedKey} ${proposedValue}`);
    this.logger.debug(`Validation:   ${validationKey} ${validationValue}\n`);

    this.logger.debug(`Validating bundle proposal by byte size and hash`);
    this.logger.debug(
      `Uploaded:     ${uploadedByteSize} ${uploadedBundleHash}`
    );
    this.logger.debug(
      `Proposed:     ${proposedByteSize} ${proposedBundleHash}`
    );
    this.logger.debug(
      `Validation:   ${validationByteSize} ${validationBundleHash}\n`
    );

    let keysEqual = false;
    let valuesEqual = false;
    let byteSizesEqual = false;
    let hashesEqual = false;

    if (uploadedKey === proposedKey && proposedKey === validationKey) {
      keysEqual = true;
    }

    if (uploadedValue === proposedValue && proposedValue === validationValue) {
      valuesEqual = true;
    }

    if (
      uploadedByteSize === proposedByteSize &&
      proposedByteSize === validationByteSize
    ) {
      byteSizesEqual = true;
    }

    if (
      uploadedBundleHash === proposedBundleHash &&
      proposedBundleHash === validationBundleHash
    ) {
      hashesEqual = true;
    }

    if (keysEqual && valuesEqual && byteSizesEqual && hashesEqual) {
      await this.voteBundleProposal(
        this.pool.bundle_proposal!.storage_id,
        VOTE.VALID
      );
    } else {
      await this.voteBundleProposal(
        this.pool.bundle_proposal!.storage_id,
        VOTE.INVALID
      );
    }
  } catch (error) {
    this.logger.warn(` Failed to validate bundle`);
    this.logger.debug(error);

    if (!hasVotedAbstain) {
      await this.voteBundleProposal(
        this.pool.bundle_proposal!.storage_id,
        VOTE.ABSTAIN
      );
    }
  }
}
