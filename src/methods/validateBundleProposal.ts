import { Node } from "..";
import { sleep } from "../utils/helpers";
import { VOTE } from "../utils/constants";
import { DataItem } from "../types";
import hash from "object-hash";

// TODO: exit after remaining upload interval if node is uploader
export async function validateBundleProposal(
  this: Node,
  createdAt: number
): Promise<void> {
  this.logger.info(
    `Validating bundle "${this.pool.bundle_proposal!.bundle_id}"`
  );

  let hasVotedAbstain = this.pool.bundle_proposal?.voters_abstain.includes(
    this.client.account.address
  );

  let proposedBundleCompressed: Buffer;

  let validationBundle: DataItem[];
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

      proposedBundleCompressed = await this.storageProvider.retrieveBundle(
        this.pool.bundle_proposal!.bundle_id
      );

      if (proposedBundleCompressed) {
        this.logger.info(
          `Successfully downloaded bundle from ${this.storageProvider.name}`
        );
      } else {
        this.logger.info(
          `Could not download bundle from ${this.storageProvider.name}. Retrying in 10s ...`
        );

        if (!hasVotedAbstain) {
          await this.voteBundleProposal(
            this.pool.bundle_proposal!.bundle_id,
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
          this.pool.bundle_proposal!.bundle_id,
          VOTE.ABSTAIN
        );
        hasVotedAbstain = true;
      }

      await sleep(10 * 1000);
      continue;
    }
  }

  const proposedByteSize = +this.pool.bundle_proposal!.byte_size;
  const validationByteSize = validationBundleCompressed!.byteLength;

  const proposedKey = this.pool.bundle_proposal!.to_key;
  const validationKey = validationBundle![validationBundle!.length - 1].key;

  const proposedValue = this.pool.bundle_proposal!.to_value;
  const validationValue = await this.runtime.getFormattedValueFromDataItem(
    validationBundle![validationBundle!.length - 1].value
  );

  const proposedBundleHash = hash(proposedBundleCompressed!);
  const validationBundleHash = hash(validationBundleCompressed!);

  this.logger.debug(`Validating bundle proposal by key and value`);
  this.logger.debug(`Proposed:     ${proposedKey} ${proposedValue}`);
  this.logger.debug(`Validation:   ${validationKey} ${validationValue}\n`);

  this.logger.debug(`Validating bundle proposal by byte size and hash`);
  this.logger.debug(`Proposed:     ${proposedByteSize} ${proposedBundleHash}`);
  this.logger.debug(
    `Validation:   ${validationByteSize} ${validationBundleHash}\n`
  );

  if (
    proposedByteSize === validationByteSize &&
    proposedKey === validationKey &&
    proposedValue === validationValue &&
    proposedBundleHash === validationBundleHash
  ) {
    await this.voteBundleProposal(
      this.pool.bundle_proposal!.bundle_id,
      VOTE.VALID
    );
  } else {
    await this.voteBundleProposal(
      this.pool.bundle_proposal!.bundle_id,
      VOTE.INVALID
    );
  }
}
