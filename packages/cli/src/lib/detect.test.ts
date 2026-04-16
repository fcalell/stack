import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { detect } from "./detect";

vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
}));

const mockedExistsSync = vi.mocked(existsSync);

afterEach(() => {
	vi.restoreAllMocks();
});

describe("detect", () => {
	const cwd = "/my/project";

	it("returns all true when all files exist", () => {
		mockedExistsSync.mockReturnValue(true);

		expect(detect(cwd)).toEqual({
			hasConfig: true,
			hasWorker: true,
			hasApp: true,
		});
	});

	it("returns all false when no files exist", () => {
		mockedExistsSync.mockReturnValue(false);

		expect(detect(cwd)).toEqual({
			hasConfig: false,
			hasWorker: false,
			hasApp: false,
		});
	});

	it("checks correct paths relative to cwd", () => {
		mockedExistsSync.mockReturnValue(false);
		detect(cwd);

		expect(mockedExistsSync).toHaveBeenCalledWith(join(cwd, "stack.config.ts"));
		expect(mockedExistsSync).toHaveBeenCalledWith(
			join(cwd, "src", "worker"),
		);
		expect(mockedExistsSync).toHaveBeenCalledWith(
			join(cwd, "src", "app", "pages"),
		);
	});

	it("each flag is independent", () => {
		mockedExistsSync.mockImplementation((path) => {
			return String(path).endsWith("stack.config.ts");
		});

		expect(detect(cwd)).toEqual({
			hasConfig: true,
			hasWorker: false,
			hasApp: false,
		});
	});
});
