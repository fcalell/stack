export function appTemplate(): string {
	return `import type { ParentProps } from "solid-js";

export default function App(props: ParentProps) {
\treturn (
\t\t<main>
\t\t\t{props.children}
\t\t</main>
\t);
}
`;
}
