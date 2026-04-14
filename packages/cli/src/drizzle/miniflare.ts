import { createHash, createHmac } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const MINIFLARE_UNIQUE_KEY = "miniflare-D1DatabaseObject";

function getMiniflareDbFilename(databaseId: string): string {
	const key = createHash("sha256").update(MINIFLARE_UNIQUE_KEY).digest();
	const nameHmac = createHmac("sha256", key)
		.update(databaseId)
		.digest()
		.subarray(0, 16);
	const hmac = createHmac("sha256", key)
		.update(nameHmac)
		.digest()
		.subarray(0, 16);
	return Buffer.concat([nameHmac, hmac]).toString("hex");
}

export function getLocalD1Path(
	databaseId: string,
	wranglerDir: string,
): string {
	const d1Dir = resolve(wranglerDir, "state/v3/d1/miniflare-D1DatabaseObject");

	if (!existsSync(d1Dir)) {
		mkdirSync(d1Dir, { recursive: true });
	}

	const filename = getMiniflareDbFilename(databaseId);
	return join(d1Dir, `${filename}.sqlite`);
}
