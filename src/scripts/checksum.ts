import crypto from "crypto";
import { createReadStream, readdirSync, writeFileSync } from "fs";

export const getChecksum = (path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const input = createReadStream(path);

    input.on("error", reject);

    input.on("data", (chunk: Buffer) => {
      hash.update(chunk);
    });

    input.on("close", () => {
      resolve(hash.digest("hex"));
    });
  });
};

const main = async () => {
  const files = readdirSync(`./out/`);
  let result = "";

  for (let file of files) {
    const checksum = await getChecksum(`./out/${file}`);

    console.log(`${file} -> ${checksum}`);
    result += `${checksum} ${file}\n`;
  }

  writeFileSync(`./out/checksum.txt`, result);
};

main();
