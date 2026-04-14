interface EnvDtsOptions {
	d1: boolean;
	auth: boolean;
}

export function envDtsTemplate(options: EnvDtsOptions): string {
	const fields: string[] = [];

	if (options.d1) {
		fields.push("\tDB_MAIN: D1Database;");
	}

	if (options.auth) {
		fields.push("\tAUTH_SECRET: string;");
		fields.push("\tAPP_URL: string;");
	}

	return `interface Env {
${fields.join("\n")}
}
`;
}
