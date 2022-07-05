"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCache = void 0;
const helpers_1 = require("../utils/helpers");
// TODO: strongly test
async function runCache() {
    let createdAt = 0;
    let currentHeight = 0;
    let toHeight = 0;
    let maxHeight = 0;
    while (true) {
        // a smaller to_height means a bundle got dropped or invalidated
        if (+this.pool.bundle_proposal.to_height < toHeight) {
            await this.cache.drop();
        }
        // cache data items from current height to required height
        createdAt = +this.pool.bundle_proposal.created_at;
        currentHeight = +this.pool.current_height;
        toHeight =
            +this.pool.bundle_proposal.to_height || +this.pool.current_height;
        maxHeight = +this.pool.max_bundle_size + toHeight;
        // clear finalized items
        let current = currentHeight;
        while (current > 0) {
            current--;
            try {
                await this.cache.del(current.toString());
            }
            catch {
                break;
            }
        }
        let startHeight;
        let key;
        // determine from which height to continue caching
        if (await this.cache.exists((toHeight - 1).toString())) {
            startHeight = toHeight;
            key = this.pool.bundle_proposal.to_key;
        }
        else {
            startHeight = currentHeight;
            key = this.pool.current_key;
        }
        this.logger.debug(`Caching from height ${startHeight} to ${maxHeight} ...`);
        for (let height = startHeight; height < maxHeight; height++) {
            for (let requests = 1; requests < 30; requests++) {
                let nextKey;
                try {
                    if (key) {
                        nextKey = await this.runtime.getNextKey(key);
                    }
                    else {
                        nextKey = this.pool.start_key;
                    }
                    const item = await this.runtime.getDataItem(nextKey, this.poolConfig, this.authenticate);
                    await this.cache.put(height.toString(), item);
                    await (0, helpers_1.sleep)(50);
                    key = nextKey;
                    break;
                }
                catch {
                    this.logger.debug(`Could not get data item from height ${height}. Retrying in 10s ...`);
                    await (0, helpers_1.sleep)(requests * 10 * 1000);
                }
            }
        }
        // wait until new bundle proposal gets created
        while (createdAt === +this.pool.bundle_proposal.created_at) {
            await (0, helpers_1.sleep)(1000);
        }
    }
}
exports.runCache = runCache;
