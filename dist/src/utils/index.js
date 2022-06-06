"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLI = void 0;
const commander_1 = require("commander");
class CLI extends commander_1.Command {
    constructor(runtime = process.env.KYVE_RUNTIME, packageVersion = process.env.KYVE_VERSION) {
        super(runtime);
        this.runtime = runtime;
        this.packageVersion = packageVersion;
        this.requiredOption("-p, --poolId <number>", "The id of the pool you want to run on.");
        this.requiredOption("-m, --mnemonic <string>", "Your mnemonic of your account.");
        this.requiredOption("-k, --keyfile <string>", "The path to your Arweave keyfile.");
        this.option("-s, --initialStake <number>", "Your initial stake the node should start with. Flag is ignored node is already staked [unit = $KYVE].");
        this.option("-n, --network <string>", "The chain id of the network. [optional, default = korellia]", "korellia");
        this.option("-sp, --space <number>", "The size of disk space in bytes the node is allowed to use. [optional, default = 1000000000 (1 GB)]", "1000000000");
        this.option("--metrics", "Run Prometheus metrics server. [optional, default = false]", false);
        this.option("-v, --verbose", "Run node in verbose mode. [optional, default = false]", false);
        this.version(packageVersion, "--version");
    }
}
exports.CLI = CLI;
