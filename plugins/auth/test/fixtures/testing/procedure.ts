// The `virtual:stack-procedure` target `createTestEntry` registers. The
// fixture workers build their procedures off their own chains, so nothing
// imports it.
import { createProcedure } from "@fcalell/plugin-api/procedure";

export const procedure = createProcedure<Record<string, unknown>>();
