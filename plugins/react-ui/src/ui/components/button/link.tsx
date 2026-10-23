import { cn } from "@fcalell/ui-core/cn";
import type { IconName } from "@fcalell/ui-core/descriptors";
import {
	type ButtonAct,
	type ButtonFit,
	button,
	buttonLabel,
	LINK_TARGET,
	link,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { follow } from "../../lib/navigate.ts";
import { Icon } from "../icon/index.tsx";

export const BOX =
	"relative inline-flex items-center justify-center max-w-full min-w-0";
export const LABEL = "truncate";
// An act's anchor keeps to its words in a stretching parent (a Gate's step), as a Button does in its stack; the `field` fit that spans its container comes after it and wins.
const KEEPS = "w-fit";
const GLYPH = "shrink-0";
export const PRESS: Record<ButtonAct, string> = {
	primary: "hover:bg-act-accent-hover active:bg-act-accent-press",
	danger: "hover:bg-act-danger-hover active:bg-act-danger-press",
	secondary: "hover:bg-wash-hover active:bg-wash-press",
	destructive: "hover:bg-wash-hover active:bg-wash-press",
	quiet: "hover:bg-wash-hover active:bg-wash-press",
};

// The accent anchor: inline is underlined at rest and plain under the pointer;
// on its own the other way round, on the target height. The line is always
// there and its colour comes and goes, which the link's answer eases (a line
// switched on and off would pop). A standalone anchor's box keeps to its words
// in a stretching parent.
const TEXT_PRESS = {
	inline: "hover:decoration-transparent active:decoration-transparent",
	standalone: cn(
		LINK_TARGET,
		"inline-flex items-center w-fit underline decoration-transparent hover:decoration-current active:decoration-current",
	),
};

/** An anchor to a route or an external URL. A plain click opens a route through the router, and a new tab, a copied link and a middle click stay the browser's. It runs nothing, so it never pends and is never blocked. With an `act` it draws in that Button's look (a way back, a Section's or a row's act that navigates; `ink` is the text class a quiet act draws in); with none, in accent ink, in the type of the line it sits in, its words the `label` or the `children` (a markdown link's runs). Outside the package's exports: the Button draws it, or a molecule whose words are nodes. */
export function ButtonLink(props: {
	act?: ButtonAct;
	fit?: ButtonFit | "inline";
	icon?: IconName;
	label?: string;
	children?: ReactNode;
	href: string;
	ink?: string;
	/** `-1` where the act's host holds the tab stop (a tree's row). */
	tabIndex?: -1;
}) {
	const tab = props.tabIndex === undefined ? {} : { tabIndex: props.tabIndex };
	if (props.act === undefined) {
		const place = props.fit === "inline" ? "inline" : "standalone";
		return (
			<a
				href={props.href}
				onClick={follow}
				{...tab}
				className={cn(link({ fit: place }), TEXT_PRESS[place])}
			>
				{props.children ?? props.label}
			</a>
		);
	}
	const kind = props.act;
	const quietInk = kind === "quiet" && props.ink;
	return (
		<a
			href={props.href}
			onClick={follow}
			{...tab}
			className={cn(
				KEEPS,
				button({ act: kind, fit: props.fit === "inline" ? "body" : props.fit }),
				BOX,
				quietInk,
				PRESS[kind],
			)}
		>
			{props.icon ? (
				<span className={GLYPH}>
					<Icon name={props.icon} fit="control" />
				</span>
			) : null}
			<span className={cn(buttonLabel({ act: kind }), LABEL, quietInk)}>
				{props.children ?? props.label}
			</span>
		</a>
	);
}
