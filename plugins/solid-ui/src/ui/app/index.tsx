/// <reference path="./virtual.d.ts" />
import "../fonts";
import { MetaProvider } from "@solidjs/meta";
import { type RouteDefinition, Router } from "@solidjs/router";
import { type QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import {
	createResource,
	ErrorBoundary,
	type JSX,
	Show,
	Suspense,
} from "solid-js";
import { render } from "solid-js/web";
import { createDefaultQueryClient } from "#lib/query";
import { EmptyState } from "../components/empty-state/index.tsx";
import { Toaster } from "../components/toast/index.tsx";

export interface CreateAppOptions {
	routes?: RouteDefinition[];
	providers?: (children: JSX.Element) => JSX.Element;
	queryClient?: QueryClient;
	errorFallback?: (err: Error, reset: () => void) => JSX.Element;
	rootId?: string;
}

export function createApp(options: CreateAppOptions = {}): void {
	const rootId = options.rootId ?? "app";
	const root = document.getElementById(rootId);
	if (!root) {
		throw new Error(`Root element #${rootId} not found`);
	}

	const queryClient = options.queryClient ?? createDefaultQueryClient();
	const wrapProviders = options.providers ?? ((children) => children);

	const [routes] = createResource(async () => {
		if (options.routes) return options.routes;
		const mod = await import("virtual:fcalell-routes");
		return mod.routes;
	});

	render(
		() => (
			<ErrorBoundary
				fallback={(err, reset) =>
					(options.errorFallback ?? defaultErrorFallback)(err, reset)
				}
			>
				{wrapProviders(
					<QueryClientProvider client={queryClient}>
						<MetaProvider>
							<Suspense>
								<Show when={routes()}>
									{(resolved) => <Router>{resolved()}</Router>}
								</Show>
							</Suspense>
							<Toaster />
						</MetaProvider>
					</QueryClientProvider>,
				)}
			</ErrorBoundary>
		),
		root,
	);
}

function defaultErrorFallback(err: Error, reset: () => void): JSX.Element {
	return (
		<EmptyState title="Something went wrong" description={err.message}>
			<button
				type="button"
				onClick={reset}
				class="text-callout underline underline-offset-4"
			>
				Retry
			</button>
		</EmptyState>
	);
}
