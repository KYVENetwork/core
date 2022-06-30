import KyveCore from "../main";

export async function voteBundleProposal(
  this: KyveCore,
  bundle_id: string,
  vote: number
): Promise<void> {
  try {
    let voteMessage = "";

    if (vote === 0) {
      voteMessage = "valid";
    } else if (vote === 1) {
      voteMessage = "invalid";
    } else if (vote === 2) {
      voteMessage = "abstain";
    } else {
      throw Error(`Invalid vote: ${vote}`);
    }

    this.logger.debug(`Voting ${voteMessage} on bundle ${bundle_id} ...`);

    const receipt = await this.client.kyve.v1beta1.base.voteProposal({
      id: this.poolId.toString(),
      bundle_id,
      vote,
    });

    if (receipt.code === 0) {
      this.logger.info(`Voted ${voteMessage} on bundle ${bundle_id}`);
    } else {
      this.logger.warn(` Could not vote on proposal. Skipping ...`);
    }
  } catch (error) {
    this.logger.error("Failed to vote. Skipping ...");
    this.logger.debug(error);
  }
}
