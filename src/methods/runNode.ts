import KyveCore from "../main";
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

    await sleep(10 * 1000);
  }
}
