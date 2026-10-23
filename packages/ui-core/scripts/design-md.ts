// Emits the contract as the package's DESIGN.md.
//
//   pnpm --filter @fcalell/ui-core design-md
import { writeFileSync } from "node:fs";
import { deriveTheme } from "../src/derive.ts";
import { designMd } from "../src/design-md.ts";

writeFileSync(
	new URL("../DESIGN.md", import.meta.url),
	designMd(deriveTheme()),
);
