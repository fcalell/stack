import { z } from "@fcalell/plugin-api/schema";

// A status mark's state, as the design contract names them.
export const status = z.enum([
	"active",
	"running",
	"waiting",
	"done",
	"attention",
	"failed",
	"idle",
]);
