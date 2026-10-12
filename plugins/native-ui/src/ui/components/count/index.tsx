import type { Closed } from "../../lib/closed";
import { CountBase } from "./base";

export interface CountProps extends Closed {
	value: number | string;
}

// A number in the muted ink, its figures at one width.
export function Count({ value }: CountProps) {
	return <CountBase value={value} />;
}
