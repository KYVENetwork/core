import { Node } from "..";
import BigNumber from "bignumber.js";
import { callWithBackoffStrategy, toHumanReadable } from "../utils";

export async function setupStake(this: Node): Promise<void> {
  let stake = new BigNumber(0);
  let toStake = new BigNumber(0);
  let toUnstake = new BigNumber(0);

  // try to parse the provided inital staking amount
  try {
    stake = new BigNumber(this.stake).multipliedBy(10 ** 9);

    if (stake.toString() === "NaN") {
      this.logger.error("Could not parse stake. Exiting ...");
      process.exit(1);
    }
  } catch (error) {
    this.logger.error("Could not parse stake. Exiting ...");
    this.logger.debug(error);
    process.exit(1);
  }

  // fetch staking info of node
  const { balance, currentStake, minimumStake, status } =
    await callWithBackoffStrategy(
      async () => {
        const data = await this.query.kyve.registry.v1beta1.stakeInfo({
          pool_id: this.poolId.toString(),
          staker: this.client.account.address,
        });

        return {
          balance: new BigNumber(data.balance),
          currentStake: new BigNumber(data.current_stake),
          minimumStake: new BigNumber(data.minimum_stake),
          status: data.status as any,
        };
      },
      { limitTimeout: "5m", increaseBy: "10s" },
      (error, ctx) => {
        this.logger.info(
          `Failed to fetch stake info of address. Retrying in ${(
            ctx.nextTimeoutInMs / 1000
          ).toFixed(2)}s ...`
        );
        this.logger.debug(error);
      }
    );

  // check if node operator stakes more than the required minimum stake
  if (stake.lte(minimumStake)) {
    this.logger.error(
      `Minimum stake is ${toHumanReadable(
        minimumStake.toString()
      )} $KYVE - desired stake only ${toHumanReadable(
        stake.toString()
      )} $KYVE. Please provide a higher staking amount. Exiting ...`
    );
    process.exit(1);
  }

  // calculate amount to stake
  if (stake.gt(currentStake)) {
    toStake = stake.minus(currentStake);

    // check if node operator has enough balance to stake
    if (balance.lt(toStake)) {
      this.logger.error(`Not enough $KYVE in wallet. Exiting ...`);
      this.logger.error(
        `Balance = ${toHumanReadable(
          balance.toString()
        )} required = ${toHumanReadable(toStake.toString())}`
      );
      process.exit(1);
    }

    // stake in pool
    await this.stakePool(toStake.toString());
  }

  // calculate amount to unstake
  if (stake.lt(currentStake)) {
    toUnstake = currentStake.minus(stake);

    // unstake from pool
    this.logger.info(
      `Node is already staked with ${toHumanReadable(
        toUnstake.toString()
      )} more $KYVE than specified.`
    );
  }

  if (status === "STAKER_STATUS_ACTIVE") {
    this.logger.info(
      `Node is ACTIVE and running with a stake of ${toHumanReadable(
        currentStake.toString()
      )} $KYVE`
    );
    this.logger.debug(`Node is already staked. Continuing ...\n`);
  }

  if (status === "STAKER_STATUS_INACTIVE") {
    this.logger.info(
      `Node is INACTIVE and running with a stake of ${toHumanReadable(
        currentStake.toString()
      )} $KYVE`
    );
    this.logger.debug(`Node is already staked. Continuing ...\n`);

    try {
      this.logger.debug(`Attempting to reactivate node`);

      const tx = await this.client.kyve.v1beta1.base.reactivateStaker({
        pool_id: this.poolId.toString(),
      });

      this.logger.debug(`ReactivateStaker = ${tx.txHash}`);

      const receipt = await tx.execute();

      if (receipt.code === 0) {
        this.logger.info(`Successfully reactivated staker\n`);
      } else {
        this.logger.error(`Could not reactivate staker. Exiting ...`);
        process.exit(1);
      }
    } catch (error) {
      this.logger.error(`Failed to reactivate staker. Exiting ...`);
      this.logger.debug(error);
      process.exit(1);
    }
  }
}
