import { Node } from "..";
import { callWithBackoffStrategy } from "../utils";

export async function syncPoolState(this: Node): Promise<void> {
  await callWithBackoffStrategy(
    async () => {
      const { pool } = await this.query.kyve.registry.v1beta1.pool({
        id: this.poolId.toString(),
      });
      this.pool = pool!;

      try {
        this.poolConfig = JSON.parse(this.pool.config);
      } catch (error) {
        this.logger.debug(
          `Failed to parse the pool config: ${this.pool?.config}`
        );
        this.poolConfig = {};
      }
    },
    { limitTimeout: "5m", increaseBy: "10s" },
    (error, ctx) => {
      this.logger.info(
        `Failed to sync pool state. Retrying in ${(
          ctx.nextTimeoutInMs / 1000
        ).toFixed(2)}s ...`
      );
      this.logger.debug(error);
    }
  );

  this.logger.debug(`Synced pool state`);
}
