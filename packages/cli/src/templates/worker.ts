interface WorkerOptions {
	auth: boolean;
}

export function workerTemplate(options: WorkerOptions): string {
	const imports = [
		'import { defineApp } from "@fcalell/api";',
		'import config from "../../stack.config";',
		'import * as routes from "./routes";',
	];

	const lines: string[] = [];
	lines.push("");
	lines.push("const app = defineApp({");
	lines.push("\tconfig,");
	lines.push("\tenv: (env: Env) => ({");
	lines.push("\t\tdb: env.DB_MAIN,");

	if (options.auth) {
		lines.push("\t\tauth: {");
		lines.push("\t\t\tsecret: env.AUTH_SECRET,");
		lines.push("\t\t\tappURL: env.APP_URL,");
		lines.push("\t\t},");
	}

	lines.push("\t}),");

	if (options.auth) {
		lines.push("\tsendOTP: async ({ email, otp, env }) => {");
		lines.push("\t\t// TODO: send OTP email");
		lines.push("\t},");
		lines.push("\tsendInvitation: async ({ email, organization, env }) => {");
		lines.push("\t\t// TODO: send invitation email");
		lines.push("\t},");
	}

	lines.push("});");
	lines.push("");
	lines.push("export const procedure = app.procedure;");
	lines.push("");
	lines.push("const api = app.handler(routes);");
	lines.push("export type AppRouter = typeof api._router;");
	lines.push("export default api;");
	lines.push("");

	return `${imports.join("\n")}\n${lines.join("\n")}`;
}
