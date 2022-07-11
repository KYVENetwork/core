"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const parser_1 = require("./parser");
const program = new commander_1.Command();
exports.default = program
    .requiredOption("-p, --poolId <number>", "The id of the pool the node should join.", parser_1.parsePoolId)
    .requiredOption("-m, --mnemonic <string>", "Your mnemonic of your account.", parser_1.parseMnemonic)
    .requiredOption("-k, --keyfile <string>", "The path to your Arweave keyfile.", parser_1.parseKeyfile)
    .option("-s, --initialStake <number>", "Your desired stake the node should run with. [unit = $KYVE].", parser_1.parseDesiredStake, "0")
    .option("-n, --network <string>", "The chain id of the network. [optional, default = korellia]", parser_1.parseNetwork, "korellia")
    .option("-v, --verbose", "Run node in verbose mode. [optional, default = false]", false)
    .option("--metrics <deprecated>", "Run Prometheus metrics server on localhost. [deprecated]", false)
    .option("--space <deprecated>", "How much bytes the node can occupy for caching [deprecated].", "1000000000");
