import { sql } from 'drizzle-orm';
import { db, zslLevelResult } from '../db';

interface ZslLevelResult {
	idLevel: number;
	idUser: number;
	position: number;
	points: number;
	time: number;
}

export async function upsertZslLevelResults(rows: ZslLevelResult[]) {
	if (!rows.length) return;

	await db.transaction(async (tx) => {
		await tx.insert(zslLevelResult)
			.values(rows)
			.onConflictDoUpdate({
				target: [zslLevelResult.idLevel, zslLevelResult.idUser],
				set: {
					points: sql`EXCLUDED.points`,
					position: sql`EXCLUDED.position`
				}
			})
	});
}
