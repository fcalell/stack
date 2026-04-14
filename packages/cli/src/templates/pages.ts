export function pagesLayoutTemplate(): string {
	return `import type { ParentProps } from "solid-js";

export default function RootLayout(props: ParentProps) {
\treturn <main>{props.children}</main>;
}
`;
}

export function pagesIndexTemplate(): string {
	return `export default function HomePage() {
\treturn <h1>Hello from @fcalell/stack</h1>;
}
`;
}
