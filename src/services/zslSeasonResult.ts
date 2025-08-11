import { sql } from 'drizzle-orm';
import { db, zslSeasonResult } from '../db';

interface ZslSeasonResult {
	idSeason: number;
	idUser: number;
	position: number;
	points: number;
}

export async function upsertZslSeasonResults(rows: ZslSeasonResult[]) {
	if (!rows.length) return;

	await db.transaction(async (tx) => {
		await tx.insert(zslSeasonResult)
			.values(rows)
			.onConflictDoUpdate({
				target: [zslSeasonResult.idSeason, zslSeasonResult.idUser],
				set: {
					points: sql`EXCLUDED.points`,
					position: sql`EXCLUDED.position`
				}
			})
	})
}
