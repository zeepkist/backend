import { defineConfig } from 'drizzle-kit';
import { DATABASE_URL } from './src/config';

export default defineConfig({
	out: './drizzle',
	schema: './drizzle/schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		url: DATABASE_URL,
		ssl: false,
	},
	schemaFilter: ['public'],
	tablesFilter: '*',
	strict: true,
	verbose: true,
});
