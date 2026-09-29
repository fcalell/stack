// Emits the contract as the repo root's DESIGN.md.
//
//   pnpm --filter @fcalell/ui-core design-md
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveTheme } from "../src/derive.ts";
import { designMd } from "../src/design-md.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
writeFileSync(resolve(root, "DESIGN.md"), designMd(deriveTheme()));
