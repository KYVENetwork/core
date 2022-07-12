import { Node } from "..";
import { toHumanReadable } from "../utils";

export async function stakePool(this: Node, amount: string): Promise<void> {
  try {
    this.logger.debug(
      `Attempting to stake ${toHumanReadable(amount)} $KYVE in pool`
    );

    const tx = await this.client.kyve.v1beta1.base.stakePool({
      id: this.poolId.toString(),
      amount,
    });

    this.logger.debug(`StakePool = ${tx.txHash}`);

    const receipt = await tx.execute();

    if (receipt.code === 0) {
      this.logger.info(
        `Successfully staked ${toHumanReadable(amount)} $KYVE\n`
      );
    } else {
      this.logger.error(
        `Could not stake ${toHumanReadable(amount)} $KYVE. Exiting ...`
      );
      process.exit(1);
    }
  } catch (error) {
    this.logger.error(
      `Failed to stake ${toHumanReadable(amount)} $KYVE. Exiting ...`
    );
    this.logger.debug(error);
    process.exit(1);
  }
}

export async function unstakePool(this: Node, amount: string): Promise<void> {
  try {
    this.logger.debug(
      `Attempting to unstake ${toHumanReadable(amount)} $KYVE from pool`
    );

    const tx = await this.client.kyve.v1beta1.base.unstakePool({
      id: this.poolId.toString(),
      amount,
    });

    this.logger.debug(`UnstakePool = ${tx.txHash}`);

    const receipt = await tx.execute();

    if (receipt.code === 0) {
      this.logger.info(
        `Successfully unstaked ${toHumanReadable(amount)} $KYVE\n`
      );
    } else {
      this.logger.error(
        `Could not unstake ${toHumanReadable(amount)} $KYVE. Exiting ...`
      );
      process.exit(1);
    }
  } catch (error) {
    this.logger.error(
      `Failed to unstake ${toHumanReadable(amount)} $KYVE. Exiting ...`
    );
    this.logger.debug(error);
    process.exit(1);
  }
}
