import { and, eq } from 'drizzle-orm';
import { db, zslSeasonResult } from '../db'

export async function upsertZslSeasonResult({
	idSeason,
	idUser,
	position,
	points,
}: {
	idSeason: number;
	idUser: number;
	position: number;
	points: number;
}) {
	await db.transaction(async (tx) => {
		const [existing] = await tx
			.select(
				{
					idSeason: zslSeasonResult.idSeason,
					position: zslSeasonResult.position,
					points: zslSeasonResult.points,
				}
			)
			.from(zslSeasonResult)
			.where(
				and(
					eq(zslSeasonResult.idUser, idUser),
					eq(zslSeasonResult.idSeason, idSeason)
				)
			)

		if (existing) {
			await tx
				.update(zslSeasonResult)
				.set({ position, points })
				.where(
					and(
						eq(zslSeasonResult.idUser, idUser),
						eq(zslSeasonResult.idSeason, idSeason)
					)
				);
		} else {
			await tx
				.insert(zslSeasonResult)
				.values({ idSeason, idUser, position, points });
		}
	});
}
