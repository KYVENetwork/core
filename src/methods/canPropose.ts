import { Node } from "..";
import { sleep } from "../utils";

export async function canPropose(this: Node): Promise<boolean> {
  if (
    this.pool.bundle_proposal!.next_uploader !== this.client.account.address
  ) {
    this.logger.info(
      `Skipping upload. Reason: Node is not the next uploader\n`
    );
    return false;
  }

  while (true) {
    try {
      const { possible, reason } =
        await this.query.kyve.registry.v1beta1.canPropose({
          pool_id: this.poolId.toString(),
          proposer: this.client.account.address,
          from_height:
            this.pool.bundle_proposal!.to_height || this.pool.current_height,
        });

      if (possible) {
        this.logger.info(`Node is able to propose a new bundle\n`);
        return true;
      } else if (reason === "Upload interval not surpassed") {
        await sleep(1000);
        continue;
      } else {
        this.logger.info(`Skipping upload. Reason: ${reason}\n`);
        return false;
      }
    } catch (error) {
      this.logger.warn(
        ` Skipping upload. Reason: Failed to execute canPropose query\n`
      );
      this.logger.debug(error);
      return false;
    }
  }
}
