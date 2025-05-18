import { SQL } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sql';
import * as schema from '../../drizzle/schema';
import { DATABASE_URL } from '../config';

const client = new SQL({
	url: DATABASE_URL,
	max: 20,
	idleTimeout: 30,
	connectionTimeout: 10,
	maxLifetime: 3600,
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

export * from '../../drizzle/schema';
export * from '../../drizzle/relations';
