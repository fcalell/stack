import type { ParentProps } from "solid-js";

export default function RootLayout(props: ParentProps) {
	return <main>{props.children}</main>;
}
