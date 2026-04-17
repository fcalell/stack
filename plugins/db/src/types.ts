export interface DbOptions {
	dialect: "d1" | "sqlite";
	databaseId?: string;
	path?: string;
	migrations?: string;
	binding?: string;
}
