"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remainingUploadInterval = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
function remainingUploadInterval() {
    const unixNow = new bignumber_js_1.default(Date.now());
    const unixIntervalEnd = new bignumber_js_1.default(this.pool.bundle_proposal.created_at)
        .plus(this.pool.upload_interval)
        .multipliedBy(1000);
    if (unixNow.lt(unixIntervalEnd)) {
        return unixIntervalEnd.minus(unixNow);
    }
    return new bignumber_js_1.default(0);
}
exports.remainingUploadInterval = remainingUploadInterval;
