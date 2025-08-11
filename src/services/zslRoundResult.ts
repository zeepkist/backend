import { sql } from 'drizzle-orm';
import { db, zslRoundResult } from '../db';

interface ZslRoundResult {
	idRound: number;
	idUser: number;
	position: number;
	points: number;
}

export async function upsertZslRoundResults(rows: ZslRoundResult[]) {
	if (!rows.length) return;

	await db.transaction(async (tx) => {
		await tx.insert(zslRoundResult)
			.values(rows)
			.onConflictDoUpdate({
				target: [zslRoundResult.idRound, zslRoundResult.idUser],
				set: {
					points: sql`EXCLUDED.points`,
					position: sql`EXCLUDED.position`
				}
			})
	})
}
