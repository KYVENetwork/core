import { Node } from "..";
import { sleep } from "../utils";

export async function runNode(this: Node): Promise<void> {
  while (true) {
    await this.syncPoolState();

    const createdAt = +this.pool.bundle_proposal!.created_at;

    this.validateRuntime();
    this.validateVersion();
    this.validateActiveNode();

    if (this.shouldIdle()) {
      await sleep("1m");
      continue;
    }

    if (await this.claimUploaderRole()) {
      await this.syncPoolState();
    }

    if (
      this.pool.bundle_proposal!.next_uploader === this.client.account.address
    ) {
      this.logger.info(
        `Starting bundle proposal round ${this.pool.total_bundles} as UPLOADER`
      );
    } else {
      this.logger.info(
        `Starting bundle proposal round ${this.pool.total_bundles} as VALIDATOR`
      );
    }

    if (await this.canVote()) {
      this.validateBundleProposal(createdAt);
    }

    const timeRemaining = this.remainingUploadInterval();

    this.logger.debug(
      `Waiting for remaining upload interval = ${timeRemaining
        .dividedBy(1000)
        .toFixed(2)}s ...`
    );

    // sleep until upload interval is reached
    await sleep(timeRemaining.toNumber());

    this.logger.debug(`Reached upload interval of current bundle proposal`);

    await this.syncPoolState();

    if (+this.pool.bundle_proposal!.created_at > createdAt) {
      continue;
    }

    if (await this.canPropose()) {
      await this.proposeBundle(createdAt);
    } else {
      await this.waitForNextBundleProposal(createdAt);
    }
  }
}
