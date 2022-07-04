import { Node } from "..";

export async function canVote(this: Node): Promise<boolean> {
  if (!this.pool.bundle_proposal!.uploader) {
    this.logger.debug(
      `Skipping vote. Reason: Node can not vote on empty bundle`
    );
    return false;
  }

  if (this.pool.bundle_proposal!.uploader === this.client.account.address) {
    this.logger.debug(`Skipping vote. Reason: Node is uploader of this bundle`);
    return false;
  }

  try {
    const { possible, reason } = await this.query.kyve.registry.v1beta1.canVote(
      {
        pool_id: this.poolId.toString(),
        voter: this.client.account.address,
        bundle_id: this.pool.bundle_proposal!.bundle_id,
      }
    );

    if (possible) {
      this.logger.debug(`Node is able to vote on bundle proposal\n`);
      return true;
    } else {
      this.logger.debug(`Skipping vote. Reason: ${reason}`);
      return false;
    }
  } catch (error) {
    this.logger.warn(` Skipping vote. Reason: Failed to execute canVote query`);
    this.logger.debug(error);
    return false;
  }
}
