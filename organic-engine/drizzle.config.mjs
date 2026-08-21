// Config do drizzle-kit. A URL vem do ambiente — nunca fica no arquivo.
export default {
	schema: "./src/db/schema.mjs",
	out: "./migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL ?? "postgres://organic:organic@localhost:5433/organic",
	},
	strict: true,
	verbose: true,
};
