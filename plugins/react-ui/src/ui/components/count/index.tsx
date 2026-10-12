import type { Closed } from "../../lib/closed.ts";
import { CountBase } from "./base.tsx";

/** A number in the muted ink. */
export interface CountProps extends Closed {
	/** The number, or its drawn form where it is capped (`tabCount`). */
	value: number | string;
}

/** A number in the muted ink, its figures at one width. */
export function Count({ value }: CountProps) {
	return <CountBase value={value} />;
}
