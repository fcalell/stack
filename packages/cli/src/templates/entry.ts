interface EntryOptions {
	api: boolean;
}

export function entryTemplate(options: EntryOptions): string {
	const imports = [
		'import { render } from "solid-js/web";',
		'import { Router } from "@solidjs/router";',
		'import App from "./app";',
		'import "./app.css";',
	];

	if (options.api) {
		imports.push('import "./lib/api";');
	}

	return `${imports.join("\n")}

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

render(
\t() => (
\t\t<Router root={App}>
\t\t\t{/* Add routes here */}
\t\t</Router>
\t),
\troot,
);
`;
}
