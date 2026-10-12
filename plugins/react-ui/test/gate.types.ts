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
// @ts-expect-error: a form comes only with a title
gate({ form: {} });
// no title: a first run, its empty state's title is the page's h1
gate({});
gate({ children: node });
gate({ empty: { sentence: "x", title: "x", act, children: node } });
// @ts-expect-error: the first run's empty state needs its sentence
gate({ empty: { title: "x" } });
// @ts-expect-error: an empty state is the first run's, a step has its title
gate({ title: "x", empty: { sentence: "x" } });
// @ts-expect-error: a lead comes only with a title
gate({ description: ["x"] });
// @ts-expect-error: a lead comes only with a title
gate({ step: { at: 1, of: 2 } });
// @ts-expect-error: the product is the mark's name
gate({ title: "x", product: "Acme" });
// @ts-expect-error: the act is a Place's
gate({ title: "x", act });
// @ts-expect-error: the foot is a Place's
gate({ title: "x", foot: "x" });
// @ts-expect-error: the more menu is a Place's
gate({ title: "x", more: [] });
