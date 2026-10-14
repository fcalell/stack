import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import { useFrameRead } from "@fcalell/plugin-api/tanstack-query";
import { frameOf } from "@fcalell/ui-core/read";
import type { ReactNode } from "react";
import { MissingBase } from "../components/missing/base.tsx";
import { EmptyBase, type EmptyFit, type EmptyProps } from "./empty.tsx";
import { useWords } from "./words.tsx";

/** A frame's one subscription to its read (a root or a selection): the form it draws, its count, whether it refetches, and the retry. */
export function useFrame(read?: Selection<unknown>) {
	const { state, retry } = useFrameRead(read, frameOf);
	return { ...state, retry };
}

export type Frame = ReturnType<typeof useFrame>;

/** What a frame draws in place of its body, or its body: the failed, missing and empty forms in the frame's `fit`; ready, waiting and idle are the loaded tree, its leaves painting. */
export function FrameBody(props: {
	frame: Frame;
	fit: EmptyFit;
	empty?: EmptyProps;
	failed?: string;
	children?: ReactNode;
}) {
	const { frame, fit, empty, failed, children } = props;
	const words = useWords();
	if (frame.form === "failed") {
		return (
			<EmptyBase
				fit={fit}
				tone="failed"
				sentence={failed ?? words.readFailed}
				act={{ label: words.retry, onAct: frame.retry, loading: frame.busy }}
			/>
		);
	}
	if (frame.form === "missing") return <MissingBase fit={fit} />;
	if (frame.form === "empty") {
		return (
			<EmptyBase
				fit={fit}
				tone="rest"
				{...{ sentence: words.readEmpty, ...empty }}
			/>
		);
	}
	return children;
}
