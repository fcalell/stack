export interface FieldConfig {
	type: "string" | "number" | "boolean";
	required?: boolean;
	defaultValue?: unknown;
	input?: boolean;
}

export interface AuthOptions {
	cookies?: { prefix?: string; domain?: string };
	session?: {
		expiresIn?: number;
		updateAge?: number;
		additionalFields?: Record<string, FieldConfig>;
	};
	user?: { additionalFields?: Record<string, FieldConfig> };
	organization?:
		| boolean
		| {
				ac?: unknown;
				roles?: Record<string, unknown>;
				additionalFields?: Record<string, FieldConfig>;
		  };
	secretVar?: string;
	appUrlVar?: string;
	rateLimiter?: {
		ip?: { binding?: string; limit?: number; period?: number };
		email?: { binding?: string; limit?: number; period?: number };
	};
}

export interface AuthRuntimeOptions {
	secretVar: string;
	appUrlVar: string;
}
