interface StackConfigOptions {
	dialect: "d1" | "sqlite";
	databaseId?: string;
	sqlitePath?: string;
	auth: boolean;
	org: boolean;
}

export function stackConfigTemplate(options: StackConfigOptions): string {
	const imports = ['import { defineConfig } from "@fcalell/config";'];

	if (options.org) {
		imports.push(
			'import { createAccessControl } from "@fcalell/db/auth/access";',
		);
	}

	imports.push('import * as schema from "./src/schema";');

	const lines: string[] = [];

	lines.push("");
	lines.push("export default defineConfig({");

	// db section
	lines.push("\tdb: {");
	if (options.dialect === "d1") {
		lines.push('\t\tdialect: "d1",');
		lines.push(
			`\t\tdatabaseId: "${options.databaseId || "YOUR_D1_DATABASE_ID"}",`,
		);
	} else {
		lines.push('\t\tdialect: "sqlite",');
		lines.push(`\t\tpath: "${options.sqlitePath || "./data/app.sqlite"}",`);
	}
	lines.push("\t\tschema,");
	lines.push("\t},");

	// auth section
	if (options.auth) {
		lines.push("\tauth: {");
		lines.push('\t\tcookies: { prefix: "app" },');
		if (options.org) {
			lines.push("\t\torganization: {");
			lines.push("\t\t\tac: createAccessControl({");
			lines.push('\t\t\t\torganization: ["update", "delete"],');
			lines.push('\t\t\t\tmember: ["create", "update", "delete"],');
			lines.push('\t\t\t\tinvitation: ["create", "cancel"],');
			lines.push("\t\t\t}),");
			lines.push("\t\t},");
		}
		lines.push("\t},");
	}

	lines.push("});");
	lines.push("");

	return `${imports.join("\n")}\n${lines.join("\n")}`;
}
