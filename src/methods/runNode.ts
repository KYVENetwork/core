import KyveCore from "..";
import { sleep } from "../utils/helpers";

export async function runNode(this: KyveCore): Promise<void> {
  while (true) {
    await this.syncPoolState();

    const createdAt = +this.pool.bundle_proposal!.created_at;

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
        `Starting bundle proposal round ${this.pool.total_bundles} as Uploader`
      );
    } else {
      this.logger.info(
        `Starting bundle proposal round ${this.pool.total_bundles} as Validator`
      );
    }

    if (await this.canVote()) {
      this.validateBundleProposal(createdAt);
    }

    const timeRemaining = this.remainingUploadInterval();

    this.logger.debug(
      `Waiting for remaining upload interval = ${timeRemaining.toString()}s ...`
    );

    // sleep until upload interval is reached
    await sleep(timeRemaining.multipliedBy(1000).toNumber());

    this.logger.debug(`Reached upload interval of current bundle proposal`);

    await this.syncPoolState();

    if (+this.pool.bundle_proposal!.created_at > createdAt) {
      continue;
    }

    if (await this.canPropose()) {
      await this.proposeBundle();
    }

    await this.waitForNextBundleProposal(createdAt);
  }
}
