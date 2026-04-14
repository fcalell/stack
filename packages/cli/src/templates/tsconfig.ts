interface TsconfigOptions {
	app: boolean;
}

export function tsconfigTemplate(options: TsconfigOptions): string {
	const config = {
		extends: options.app
			? "@fcalell/typescript-config/solid-vite.json"
			: "@fcalell/typescript-config/node-tsx.json",
		include: ["src"],
	};

	return `${JSON.stringify(config, null, "\t")}\n`;
}
