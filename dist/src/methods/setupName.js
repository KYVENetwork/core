"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupName = void 0;
const prando_1 = __importDefault(require("prando"));
const unique_names_generator_1 = require("unique-names-generator");
function setupName() {
    const r = new prando_1.default(`${this.poolId}-${this.mnemonic}-${this.coreVersion}`);
    return (0, unique_names_generator_1.uniqueNamesGenerator)({
        dictionaries: [unique_names_generator_1.adjectives, unique_names_generator_1.colors, unique_names_generator_1.animals],
        separator: "-",
        length: 3,
        style: "lowerCase",
        seed: r.nextInt(0, unique_names_generator_1.adjectives.length * unique_names_generator_1.colors.length * unique_names_generator_1.animals.length),
    }).replace(" ", "-");
}
exports.setupName = setupName;
