"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadBundle = void 0;
async function loadBundle(fromHeight, toHeight) {
    const bundle = [];
    for (let height = fromHeight; height < toHeight; height++) {
        try {
            bundle.push(await this.cache.get(height.toString()));
        }
        catch {
            break;
        }
    }
    let toKey = "";
    let toValue = "";
    if (bundle.length) {
        const latestItem = bundle[bundle.length - 1];
        toKey = latestItem.key;
        toValue = await this.runtime.formatValue(latestItem.value);
    }
    return {
        bundle,
        toKey,
        toValue,
    };
}
exports.loadBundle = loadBundle;
