import type { ComponentType } from "react";
import type { ShowcaseFrame } from "./cells.ts";

// A roster name to the component that draws its frames. A name missing here
// draws its frame with the component's name and the cell's strings.
export const registry: Partial<
	Record<string, ComponentType<{ frame: ShowcaseFrame }>>
> = {};
