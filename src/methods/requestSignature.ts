import { Signature, Node } from "..";

export async function requestSignature(this: Node): Promise<Signature> {
  const address = this.client.account.address;
  const timestamp = new Date().valueOf().toString();

  // TODO: Implement
  const message = `${address}//${this.poolId}//${timestamp}`;
  // const signature = await this.client.nativeClient.sign(address, );

  // return {
  //   address,
  //   pubKey: pub_key.value,
  //   signature,
  //   poolId: this.poolId.toString(),
  //   timestamp,
  // };

  return {
    address,
    poolId: this.poolId.toString(),
    timestamp,
    pubKey: "",
    signature: "",
  };
}
