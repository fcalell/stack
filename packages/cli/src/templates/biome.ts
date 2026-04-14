export function biomeTemplate(): string {
	const config = {
		extends: ["@fcalell/biome-config/shared.json"],
	};

	return `${JSON.stringify(config, null, "\t")}\n`;
}
