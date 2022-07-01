import { Node } from "..";
import BigNumber from "bignumber.js";
import { callWithBackoffStrategy, toHumanReadable } from "../utils/helpers";

export async function setupStake(this: Node): Promise<void> {
  let initialStake = new BigNumber(0);

  const { balance, currentStake, minimumStake } = await callWithBackoffStrategy(
    async () => {
      const data = await this.query.kyve.registry.v1beta1.stakeInfo({
        pool_id: this.poolId.toString(),
        staker: this.client.account.address,
      });

      return {
        balance: new BigNumber(data.balance),
        currentStake: new BigNumber(data.current_stake),
        minimumStake: new BigNumber(data.minimum_stake),
      };
    },
    { limitTimeout: "5m", increaseBy: "10s" },
    (_, ctx) => {
      this.logger.warn(
        ` Failed to fetch stake info of address. Retrying in ${
          ctx.nextTimeoutInMs / 1000
        }s ...`
      );
    }
  );

  // check if node has already staked
  if (!currentStake.isZero()) {
    this.logger.info(
      `Node running with a stake of ${toHumanReadable(
        currentStake.toString()
      )} $KYVE`
    );
    this.logger.debug(`Node is already staked. Continuing ...\n`);
    return;
  }

  // try to parse the provided inital staking amount
  try {
    initialStake = new BigNumber(this.initialStake).multipliedBy(10 ** 9);

    if (initialStake.toString() === "NaN") {
      this.logger.error("Could not parse initial stake. Exiting ...");
      process.exit(1);
    }

    if (initialStake.isZero()) {
      this.logger.error(
        "Initial stake can not be zero. Please provide a higher stake. Exiting ..."
      );
      process.exit(0);
    }
  } catch (error) {
    this.logger.error("Could not parse initial stake. Exiting ...");
    process.exit(1);
  }

  // check if node operator has more stake than the required minimum stake
  if (initialStake.lte(minimumStake)) {
    this.logger.error(
      ` Minimum stake is ${toHumanReadable(
        minimumStake.toString()
      )} $KYVE - initial stake only ${toHumanReadable(
        initialStake.toString()
      )} $KYVE. Please provide a higher staking amount. Exiting ...`
    );
    process.exit(0);
  }

  // check if node operator has enough balance to stake
  if (balance.lt(initialStake)) {
    this.logger.error(`Not enough $KYVE in wallet. Exiting ...`);
    this.logger.error(
      `Balance = ${toHumanReadable(
        balance.toString()
      )} required = ${toHumanReadable(initialStake.toString())}`
    );
    process.exit(0);
  }

  this.logger.debug(
    `Staking ${toHumanReadable(initialStake.toString())} $KYVE in pool "${
      this.pool.name
    }" to become a validator`
  );

  try {
    const receipt = await this.client.kyve.v1beta1.base.stakePool({
      id: this.poolId.toString(),
      amount: initialStake.toString(),
    });

    if (receipt.code === 0) {
      this.logger.info(
        `Node running with a stake of ${toHumanReadable(
          initialStake.toString()
        )} $KYVE`
      );
      this.logger.debug(
        `Successfully staked ${toHumanReadable(
          initialStake.toString()
        )} $KYVE\n`
      );
    } else {
      this.logger.error(
        `Failed to stake ${toHumanReadable(
          initialStake.toString()
        )} $KYVE. Exiting ...`
      );
      process.exit(1);
    }
  } catch {
    this.logger.error(
      `Failed to stake ${toHumanReadable(
        initialStake.toString()
      )} $KYVE. Exiting ...`
    );
    process.exit(1);
  }
}
