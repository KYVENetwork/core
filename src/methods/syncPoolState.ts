import { Node } from "..";
import { callWithBackoffStrategy } from "../utils/helpers";

export async function syncPoolState(this: Node): Promise<void> {
  this.logger.debug(`Attempting to fetch pool state`);

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
    (_, ctx) => {
      this.logger.debug(
        `Failed to fetch pool state. Retrying in ${
          ctx.nextTimeoutInMs / 1000
        }s ...`
      );
    }
  );

  this.logger.debug(`Successfully fetched pool state`);
}
