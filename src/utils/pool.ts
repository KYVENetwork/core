import { Contract, Wallet } from "ethers";
import ABI from "../abi/pool.json";

const Pool = (address: string, wallet: Wallet): Contract => {
  return new Contract(address, ABI, wallet);
};

export default Pool;
