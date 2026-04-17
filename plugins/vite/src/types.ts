import { z } from "zod";

export const viteOptionsSchema = z.object({
	port: z.number().optional(),
});

export type ViteOptions = z.input<typeof viteOptionsSchema>;
