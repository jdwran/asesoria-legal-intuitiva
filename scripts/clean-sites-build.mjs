import { rm } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");

for (const directory of ["dist", ".vinext"]) {
  const target = path.resolve(projectRoot, directory);
  if (path.dirname(target) !== projectRoot) {
    throw new Error(`Refusing to clean an unexpected path: ${target}`);
  }
  await rm(target, { recursive: true, force: true });
}

