import { eq } from 'drizzle-orm';
import { db, userPoints } from '../db';

export async function updateUserPoints({
	idUser,
	points,
	totalPoints,
}: {
	idUser: number;
	points: number;
	totalPoints: number;
}): Promise<void> {
	await db.transaction(async (tx) => {
		await tx
			.update(userPoints)
			.set({
				points,
				totalPoints,
				dateUpdated: new Date().toISOString(),
			})
			.where(eq(userPoints.idUser, idUser));
	});
}

export async function updateUserRank({
	idUser,
	rank,
}: {
	idUser: number;
	rank: number;
}): Promise<void> {
	await db.transaction(async (tx) => {
		await tx
			.update(userPoints)
			.set({
				rank,
				dateUpdated: new Date().toISOString(),
			})
			.where(eq(userPoints.idUser, idUser));
	});
}
