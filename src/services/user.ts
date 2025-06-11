import { eq, sql } from 'drizzle-orm';
import { db, user } from '../db';
import { getSteamUser } from '../steam/user.ts';

export async function getUser(steamId: bigint): Promise<typeof user.$inferSelect | null> {
	const existingUser = await db.query.user.findFirst({
		where: eq(user.steamId, steamId),
	});

	return existingUser || null;
}

export async function getOrInsertUser(steamId: bigint): Promise<typeof user.$inferSelect> {
	const existingUser = await getUser(steamId);

	if (existingUser) {
		return existingUser;
	}

	console.debug(`Creating new user ${steamId}`);

	const { personaname: steamName } = await getSteamUser(steamId);
	const now = new Date().toISOString();

	const userData: typeof user.$inferInsert = {
		steamId,
		steamName,
		dateCreated: now,
		dateUpdated: now,
	};

	const newUser = await db.transaction(async (tx) => {
		const [insertedUser] = await tx.insert(user).values(userData).returning();

		return insertedUser;
	});

	if (!newUser) {
		throw new Error(`Failed to create user ${steamId}`);
	}

	console.debug(`User ${steamId} created with ID ${newUser.id}`);

	return newUser;
}

export async function updateUserName(
	steamId: bigint,
	newName: string,
): Promise<typeof user.$inferSelect> {
	const updatedUser = await db.transaction(async (tx) => {
		const now = new Date().toISOString();

		const [updated] = await tx
			.update(user)
			.set({
				steamName: newName,
				dateUpdated: now,
			})
			.where(eq(user.steamId, steamId))
			.returning();

		return updated;
	});

	if (!updatedUser) {
		throw new Error(`Failed to update user ${steamId}`);
	}

	console.debug(`User ${steamId} updated to name ${newName}`);

	return updatedUser;
}

export async function updateDiscordId(
	steamId: bigint,
	discordId: bigint,
): Promise<typeof user.$inferSelect> {
	const updatedUser = await db.transaction(async (tx) => {
		const now = new Date().toISOString();

		const [updated] = await tx
			.update(user)
			.set({
				discordId,
				dateUpdated: now,
			})
			.where(eq(user.steamId, steamId))
			.returning();

		return updated;
	});

	if (!updatedUser) {
		throw new Error(`Failed to update user ${steamId}`);
	}

	console.debug(`User ${steamId} updated to Discord ID ${discordId}`);

	return updatedUser;
}

export async function getTotalUsers(): Promise<number> {
	const totalUsers = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(user)
		.then((rows) => Number(rows[0]?.count));

	return totalUsers ?? 0;
}

export async function getAllUsers() {
	const users = await db.select({ idUser: user.id }).from(user).orderBy(user.id);

	return users;
}
