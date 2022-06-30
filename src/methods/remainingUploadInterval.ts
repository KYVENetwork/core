import BigNumber from "bignumber.js";
import KyveCore from "..";

export function remainingUploadInterval(this: KyveCore): BigNumber {
  const unixNow = new BigNumber(Math.floor(Date.now() / 1000));
  const unixIntervalEnd = new BigNumber(
    this.pool.bundle_proposal!.created_at
  ).plus(this.pool.upload_interval);

  if (unixNow.lt(unixIntervalEnd)) {
    return unixIntervalEnd.minus(unixNow);
  }

  return new BigNumber(0);
}
