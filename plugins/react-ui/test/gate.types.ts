import { createElement } from "react";
import type { GateProps } from "../src/ui/components/gate/index.tsx";

const gate = (props: GateProps) => props;
const act = { label: "x", onAct: () => {} };
const node = createElement("b");

// a gate takes its head as data
gate({ title: "Sign in" });
gate({ title: "x", step: { at: 1, of: 2 } });
// @ts-expect-error: the mark is the app's icon, not a prop
gate({ title: "x", mark: { src: "/mark.svg", name: "Acme" } });
gate({
	title: "x",
	description: ["We sent a code to ", { strong: "ana@acme.dev" }],
});
// @ts-expect-error: a description is data, never a node
gate({ title: "x", description: node });
// @ts-expect-error: a description is runs, never one string
gate({ title: "x", description: "Signed in as ana" });
// a step's form is data, drawn in the gate's column
gate({ title: "x", form: { bar: { acts: [act] } } });
gate({ title: "x", form: { groups: [{ title: "x", fields: node }] } });
// @ts-expect-error: a form's structure is children or groups, never both
gate({ title: "x", form: { children: node, groups: [] } });
// @ts-expect-error: the title is required, a first run's too
gate({});
// @ts-expect-error: the title is required
gate({ children: node });
// @ts-expect-error: a first run is a titled gate, there is no empty state
gate({ title: "x", empty: { sentence: "x" } });
// a first run is a title, a description and its buttons as children
gate({ title: "x", description: ["x"], children: node });
// @ts-expect-error: the product is the mark's name
gate({ title: "x", product: "Acme" });
// @ts-expect-error: the act is a Place's
gate({ title: "x", act });
// @ts-expect-error: the foot is a Place's
gate({ title: "x", foot: "x" });
// @ts-expect-error: the more menu is a Place's
gate({ title: "x", more: [] });
