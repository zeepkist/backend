import { and, eq } from 'drizzle-orm';
import { db, zslRoundResult } from '../db';

export async function upsertZslRoundResult({
	idRound,
	idUser,
	position,
	points,
}: {
	idRound: number;
	idUser: number;
	position: number;
	points: number;
}) {
	await db.transaction(async (tx) => {
		const [existing] = await tx
			.select({
				idRound: zslRoundResult.idRound,
				position: zslRoundResult.position,
				points: zslRoundResult.points,
			})
			.from(zslRoundResult)
			.where(and(eq(zslRoundResult.idUser, idUser), eq(zslRoundResult.idRound, idRound)));

		if (existing) {
			await tx
				.update(zslRoundResult)
				.set({ position, points })
				.where(and(eq(zslRoundResult.idUser, idUser), eq(zslRoundResult.idRound, idRound)));
		} else {
			await tx.insert(zslRoundResult).values({ idRound, idUser, position, points });
		}
	});
}
