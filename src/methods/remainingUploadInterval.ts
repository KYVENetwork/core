import { Node } from "..";
import BigNumber from "bignumber.js";

export function remainingUploadInterval(this: Node): BigNumber {
  const unixNow = new BigNumber(Date.now());
  const unixIntervalEnd = new BigNumber(this.pool.bundle_proposal!.created_at)
    .plus(this.pool.upload_interval)
    .multipliedBy(1000);

  if (unixNow.lt(unixIntervalEnd)) {
    return unixIntervalEnd.minus(unixNow);
  }

  return new BigNumber(0);
}
