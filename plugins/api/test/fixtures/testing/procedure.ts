// The `virtual:stack-procedure` target the fixture routes import.
import { createProcedure } from "../../../src/procedure.ts";
import type { BaseContext } from "../../../src/worker/index.ts";

export const procedure = createProcedure<BaseContext>();
