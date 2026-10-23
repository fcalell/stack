/// <reference path="../worker.d.ts" />
import ELK, { type ElkNode } from "elkjs/lib/elk-api.js";
import ElkWorker from "elkjs/lib/elk-worker.min.js?worker";

// The only module that touches the worker, and one a bundler must serve as
// source: a `?worker` import cannot survive Vite's dependency pre-bundling, so
// the canvas reaches this module by its package name and `canvasPlugin` keeps
// it out of the pre-bundle. The worker is ELK's own file; `elk.bundled.js`
// fails as a module worker once pre-bundled.
let elk: InstanceType<typeof ELK> | undefined;

export function layoutElk(graph: ElkNode): Promise<ElkNode> {
	elk ??= new ELK({ workerFactory: () => new ElkWorker() });
	return elk.layout(graph);
}
