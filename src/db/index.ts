import { SQL } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sql';
import { DATABASE_URL } from '../config';
import * as schema from './schema';

const client = new SQL({
	url: DATABASE_URL,
	max: 20,
	idleTimeout: 30,
	connectionTimeout: 30,
	maxLifetime: 0,
	tls: false,
	bigint: true,

	onconnect: (client) => {
		// console.log('Connected to PostgreSQL database');
	},

	onclose: (client) => {
		// console.log('Disconnected from PostgreSQL database');
	},
});

export const db = drizzle({ client, schema });

export * from './schema';
export * from './relations';
