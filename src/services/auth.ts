import { eq } from 'drizzle-orm';
import { auth, db, type user } from '../db';

interface AuthData {
	user: Pick<typeof user.$inferInsert, 'id'>;
	accessToken: string;
	accessTokenExpiry: bigint;
	refreshToken: string;
	refreshTokenExpiry: bigint;
}

export async function insertAuth({
	user,
	accessToken,
	accessTokenExpiry,
	refreshToken,
	refreshTokenExpiry,
}: AuthData) {
	await db.transaction(async (tx) => {
		await tx.insert(auth).values({
			idUser: user.id,
			accessToken,
			accessTokenExpiry,
			refreshToken,
			refreshTokenExpiry,
			type: 0,
			dateCreated: new Date().toISOString(),
		});
	});
}

export async function getAuth(idUser: number, token: string) {
	const authData = await db.query.auth.findFirst({
		where: (auth, { eq }) => eq(auth.idUser, idUser) && eq(auth.refreshToken, token),
	});

	if (!authData) {
		return null;
	}

	return authData;
}

export async function deleteAuth(refreshToken: string) {
	await db.transaction(async (tx) => {
		await tx.delete(auth).where(eq(auth.refreshToken, refreshToken));
	});
}
