/// <reference path="./virtual.d.ts" />
import "../fonts";
import type { Words } from "@fcalell/ui-core/tokens";
import { ENGLISH } from "@fcalell/ui-core/tokens";
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
import { type IconSet, IconsProvider } from "#lib/icons.tsx";
import { createDefaultQueryClient } from "#lib/query.ts";
import { WordsProvider } from "#lib/words.tsx";
import { EmptyState } from "../components/empty-state/index.tsx";

export interface CreateAppOptions {
	routes?: RouteDefinition[];
	providers?: (children: JSX.Element) => JSX.Element;
	queryClient?: QueryClient;
	errorFallback?: (err: Error, reset: () => void) => JSX.Element;
	rootId?: string;
	// The consumer's closed icon set, read by `Icon`, a row's marks and the
	// shell's places.
	icons?: IconSet;
	// The words the molecules speak; omitted, English. The generated entry
	// mounts the same provider from the plugin option.
	words?: Words;
	// The sentence the default error fallback draws under its title.
	errorTitle?: string;
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

	const withWords = (children: JSX.Element) =>
		options.words ? (
			<WordsProvider words={options.words}>{children}</WordsProvider>
		) : (
			children
		);

	render(
		() => (
			<ErrorBoundary
				fallback={(err, reset) =>
					(options.errorFallback ?? defaultErrorFallback(options))(err, reset)
				}
			>
				{wrapProviders(
					withWords(
						<IconsProvider icons={options.icons ?? {}}>
							<QueryClientProvider client={queryClient}>
								<MetaProvider>
									<Suspense>
										<Show when={routes()}>
											{(resolved) => <Router>{resolved()}</Router>}
										</Show>
									</Suspense>
								</MetaProvider>
							</QueryClientProvider>
						</IconsProvider>,
					),
				)}
			</ErrorBoundary>
		),
		root,
	);
}

// The error sentence is the thrown message; the title is the consumer's word
// and the act's label is `words.retry`.
function defaultErrorFallback(options: CreateAppOptions) {
	return (err: Error, reset: () => void): JSX.Element => (
		<EmptyState
			title={options.errorTitle ?? err.name}
			sentence={err.message}
			act={{ label: (options.words ?? ENGLISH).retry, onAct: reset }}
		/>
	);
}
