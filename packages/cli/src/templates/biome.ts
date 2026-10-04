export function biomeTemplate(): string {
	const config = {
		// The installed biome's own schema, so it never lags the version.
		$schema: "./node_modules/@biomejs/biome/configuration_schema.json",
		extends: ["@fcalell/biome-config/shared.json"],
	};

	return `${JSON.stringify(config, null, "\t")}\n`;
}
