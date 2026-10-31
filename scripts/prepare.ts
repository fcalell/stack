// A stack package's `prepare` (run from the package's directory: `node ../../scripts/prepare.ts`).
//
// An install of a checkout (`link:`, a git spec, `pnpm install` in the workspace) has no `dist/`
// until this builds it. `pnpm pack` and `pnpm publish` run `prepare` too, but a release builds
// once, before either (`pnpm turbo run build`, which `pnpm release:check` and `pnpm release`
// run), so under those two commands a `dist/` already there is the build, and building it again
// would only repeat it. Without one, it builds.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const packing = ["pack", "publish"].includes(process.env.npm_command ?? "");
if (packing && existsSync("dist")) process.exit(0);

const result = spawnSync("pnpm", ["build"], { stdio: "inherit" });
process.exit(result.status ?? 1);
