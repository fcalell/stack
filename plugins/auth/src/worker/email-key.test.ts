import { describe, expect, it } from "vitest";
import { emailKey } from "./email-key";

describe("emailKey", () => {
	it("folds gmail +tag and dots to the same key", () => {
		expect(emailKey("Victim+1@Gmail.com")).toBe(
			emailKey("v.i.c.t.i.m@gmail.com"),
		);
	});

	it("lowercases the domain and local part", () => {
		expect(emailKey("User@Example.COM")).toBe("user@example.com");
	});

	it("preserves dots for non-gmail domains", () => {
		expect(emailKey("first.last@example.com")).toBe("first.last@example.com");
	});

	it("strips +tag for non-gmail domains too", () => {
		expect(emailKey("user+promo@example.com")).toBe("user@example.com");
	});

	it("folds googlemail.com the same as gmail.com", () => {
		expect(emailKey("a.b+x@googlemail.com")).toBe("ab@googlemail.com");
	});

	it("returns the lowercase input unchanged when there is no @", () => {
		expect(emailKey("NOT-AN-EMAIL")).toBe("not-an-email");
	});
});
