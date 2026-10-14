import assert from "node:assert/strict";
import { test } from "node:test";
import {
	arbitraryLengths,
	arbitraryValues,
	childReads,
	contexts,
	cssLayoutMotion,
	datasets,
	layoutMotion,
	literalLengths,
	measures,
	NATIVE_MEASURES,
	outsideList,
	sectionNests,
	transitionedLayout,
	typeProps,
	WEB_MEASURES,
} from "../src/structure.ts";

const texts = (hits: Array<{ text: string }>) => hits.map((hit) => hit.text);

test("b-children fails on a walk of a React child and passes on data", () => {
	const bad = `
import { Children, cloneElement } from "react";
const a = Children.map(children, (child) => cloneElement(child, {}));
const b = isValidElement(x) && child.type === "div";
const c = element.type !== Fragment;
const d = item.props.children.type === "span";
switch (child.type) { default: }
`;
	assert.deepEqual(
		childReads(bad).map((hit) => hit.line),
		[2, 2, 3, 3, 4, 4, 5, 6, 7],
	);
	const good = `
const a = token.type === "heading";
const b = part.type === "currency";
const c = record.type === "childList" && record.target === node;
const d = event.type !== "keydown";
// Children.map(children) in a comment
const e = "cloneElement in a string";
`;
	assert.deepEqual(childReads(good), []);
});

test("b-arbitrary fails on a literal length and passes on a token calc and a selector", () => {
	for (const token of [
		"w-[56rem]",
		"h-[40px]",
		"max-w-[calc(100%-8px)]",
		"z-[50]",
		"min-[640px]:flex",
		"hover:p-[0.5rem]",
		"[margin:12px]",
		"w-[20.5vw]",
	])
		assert.notDeepEqual(arbitraryLengths(token), [], token);
	for (const token of [
		"py-[calc((var(--spacing-control)-1lh)/2)]",
		"max-w-[min(var(--spacing-measure),calc(100cqw_-_2*var(--spacing-page)))]",
		"pt-[calc(1lh/2)]",
		"not-has-[button:hover]:p-card",
		"in-data-[modality=pointer]:outline-none",
		"peer-focus-visible:not-in-data-[modality=pointer]:ring",
		"transition-[translate,transform,opacity]",
		"grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]",
		"bottom-[anchor(--docked-foot_top,0px)]",
		"m-[0px]",
		"[container-type:size]",
		"[&>*]:p-2",
		"w-[--foot-2]",
		"p-card",
	])
		assert.deepEqual(arbitraryLengths(token), [], token);
});

test("b-arbitrary reads the string literals of a file, not its comments", () => {
	const source = `
// w-[56rem]
const A = "flex w-[56rem]";
const B = \`gap-card \${x} h-[40px]\`;
const C = "pt-[calc(1lh/2)]";
`;
	assert.deepEqual(
		arbitraryValues(source).map((hit) => hit.line),
		[3, 4],
	);
	assert.deepEqual(literalLengths("calc(100% - 8px)"), ["100%", "8px"]);
});

test("b-measure fails on a measure and names it once per place", () => {
	const bad = `
const watch = new ResizeObserver(read);
const { width } = node.getBoundingClientRect();
const wide = matchMedia("(min-width: 1px)").matches;
// scrollWidth in a comment
`;
	assert.deepEqual(texts(measures(bad, WEB_MEASURES)), [
		"ResizeObserver",
		"getBoundingClientRect",
		"matchMedia",
	]);
	assert.deepEqual(
		texts(measures("<View onLayout={f} />", NATIVE_MEASURES, "x.tsx")),
		["onLayout"],
	);
	assert.deepEqual(measures("const x = 1;", WEB_MEASURES), []);
});

test("b-context fails on an unlisted createContext, however it is imported", () => {
	const source = `
import * as React from "react";
import { createContext } from "react";
export const A = createContext(false);
const B = React.createContext<string | undefined>(undefined);
`;
	assert.deepEqual(texts(contexts(source)), ["A", "B"]);
	assert.deepEqual(contexts("const x = use(A);"), []);
});

test("b-dataset fails on a dataset read or write", () => {
	assert.deepEqual(texts(datasets("root.dataset.density = view.density;")), [
		"dataset",
	]);
	assert.deepEqual(datasets("el.setAttribute('data-x', '1')"), []);
});

test("b-type-prop fails on a type prop and passes on a data type", () => {
	const bad = `
export interface BoxProps { type?: "a" | "b"; }
export function Box({ type, ...rest }: BoxProps) { return null; }
export const Row = (props: RowProps) => props.type === "x";
`;
	assert.equal(typeProps(bad).length, 3);
	const good = `
export interface BoxProps { kind?: "a" | "b"; }
export function Box({ kind }: BoxProps) { return null; }
const blob = new Blob([text], { type: "text/plain" });
function pick({ type }: Token) { return type; }
const parts = items.map(({ type }) => type);
`;
	assert.deepEqual(typeProps(good), []);
});

test("b-section-nest fails on a Section in a Section's body and passes on siblings", () => {
	const bad = `
const a = (
	<Section title="Outer">
		<Group>
			<Section title="Inner" />
		</Group>
	</Section>
);`;
	assert.deepEqual(
		sectionNests(bad).hits.map((hit) => hit.line),
		[5],
	);
	assert.equal(sectionNests(bad).drawn, 1);
	const good = `
const a = (
	<>
		<Section title="One">
			<Text>body</Text>
		</Section>
		<Section title="Two" />
	</>
);`;
	assert.deepEqual(sectionNests(good), { drawn: 1, hits: [] });
});

test("a closed list fails on an unlisted file and on a stale entry", () => {
	const found = new Map<string, string[]>([
		["lib/page.ts", ["ResizeObserver"]],
		["components/canvas/node.tsx", ["ResizeObserver"]],
		["components/new/index.tsx", ["matchMedia"]],
		["lib/quiet.ts", []],
	]);
	const list = {
		"lib/page.ts": "the page's width",
		"components/canvas/": "the canvas",
		"lib/gone.ts": "a file that stopped measuring",
	};
	assert.deepEqual(outsideList(found, list), {
		unlisted: ["components/new/index.tsx"],
		stale: ["lib/gone.ts"],
	});
});

test("b-motion fails on a size or place animated through layout and passes on a transform", () => {
	for (const token of [
		"transition-all",
		"hover:transition-all",
		"transition-[height]",
		"transition-[opacity,width]",
		"transition-[grid-template-columns]",
		"[transition-property:margin-top]",
		"[transition:height_200ms_ease]",
	])
		assert.notDeepEqual(transitionedLayout(token), [], token);
	for (const token of [
		"transition",
		"transition-colors",
		"transition-[opacity,translate]",
		"transition-[translate,transform,opacity]",
		"transition-[clip-path,filter]",
		"duration-base",
	])
		assert.deepEqual(transitionedLayout(token), [], token);
	const bad = `
const A = "transition-[height] duration-base";
el.animate([{ width: "0%" }, { width: "100%" }], { duration: 1 });
const s = useAnimatedStyle(() => ({ width: share.value }));
const t = useAnimatedStyle(() => { return { marginTop: lift.value }; });
`;
	assert.deepEqual(texts(layoutMotion(bad)), [
		"transition-[height] (height)",
		"width",
		"width",
		"width",
		"marginTop",
	]);
	const good = `
// transition-[height] in a comment
const A = "transition-[opacity,translate] duration-base";
el.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 1 });
const s = useAnimatedStyle(() => ({ transform: [{ scaleX: share.value }], opacity: 1 }));
`;
	assert.deepEqual(layoutMotion(good), []);
	const css = `
.a { transition: height 200ms ease, opacity 200ms; }
/* transition: width 1s */
.b { transition-property: opacity, transform; }
@keyframes grow {
	from { max-height: 0; }
	to { opacity: 1; }
}
@keyframes show {
	from { opacity: 0; transform: scale(0.96); }
}
`;
	assert.deepEqual(
		cssLayoutMotion(css).map((hit) => hit.line),
		[2, 6],
	);
});
