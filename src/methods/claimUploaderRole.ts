import { Node } from "..";

export async function claimUploaderRole(this: Node): Promise<boolean> {
  // check if next uploader is free to claim
  if (this.pool.bundle_proposal!.next_uploader) {
    return false;
  }

  try {
    const tx = await this.client.kyve.v1beta1.base.claimUploaderRole({
      id: this.poolId.toString(),
    });

    this.logger.debug(`Tx = ${tx.txHash}`);

    const receipt = await tx.execute();

    if (receipt.code === 0) {
      this.logger.info(`Successfully claimed uploader role`);
      return true;
    } else {
      this.logger.info(`Could not claim uploader role. Continuing ...`);
      return false;
    }
  } catch (error) {
    this.logger.warn(" Failed to claim uploader role. Continuing ...");
    this.logger.debug(error);
    return false;
  }
}
