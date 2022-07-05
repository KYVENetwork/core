"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
async function authenticate() {
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
        pubKey: "",
        signature: "",
        poolId: this.poolId.toString(),
        timestamp,
    };
}
exports.authenticate = authenticate;
