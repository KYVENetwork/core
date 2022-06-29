import KyveCore from "../main";
import { sleep } from "../utils/helpers";

export async function shouldIdle(this: KyveCore): Promise<boolean> {
  // check if pool is upgrading
  if (
    +this.pool.upgrade_plan!.scheduled_at > 0 &&
    Math.floor(Date.now() / 1000) >= +this.pool.upgrade_plan!.scheduled_at
  ) {
    this.logger.warn(" Pool is upgrading. Idling ...");
    await sleep(60 * 1000);
    return true;
  }

  // check if pool is paused
  if (this.pool.paused) {
    this.logger.warn(" Pool is paused. Idling ...");
    await sleep(60 * 1000);
    return true;
  }

  // check if enough nodes are online
  if (this.pool.stakers.length < 2) {
    this.logger.warn(
      " Not enough nodes online. Waiting for another validator to join. Idling ..."
    );
    await sleep(60 * 1000);
    return true;
  }

  // check if pool is funded
  if (+this.pool.total_funds === 0) {
    this.logger.warn(
      " Pool is out of funds. Waiting for additional funds. Idling ..."
    );
    await sleep(60 * 1000);
    return true;
  }

  return false;
}