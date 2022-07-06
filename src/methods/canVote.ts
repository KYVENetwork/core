import { Node } from "..";

export async function canVote(this: Node): Promise<boolean> {
  if (!this.pool.bundle_proposal!.uploader) {
    this.logger.info(
      `Skipping vote. Reason: Node can not vote on empty bundle\n`
    );
    return false;
  }

  if (this.pool.bundle_proposal!.uploader === this.client.account.address) {
    this.logger.info(
      `Skipping vote. Reason: Node is uploader of this bundle\n`
    );
    return false;
  }

  try {
    const { possible, reason } = await this.query.kyve.registry.v1beta1.canVote(
      {
        pool_id: this.poolId.toString(),
        voter: this.client.account.address,
        storage_id: this.pool.bundle_proposal!.storage_id,
      }
    );

    if (possible) {
      this.logger.info(`Node is able to vote on bundle proposal\n`);
      return true;
    } else {
      this.logger.info(`Skipping vote. Reason: ${reason}\n`);
      return false;
    }
  } catch (error) {
    this.logger.warn(
      ` Skipping vote. Reason: Failed to execute canVote query\n`
    );
    this.logger.debug(error);
    return false;
  }
}
