import { asc, eq, inArray, sql } from 'drizzle-orm';
import { db, user } from '../db';
import { getSteamUser, type SteamUserData } from '../steam';

export async function getUser(steamId: string): Promise<typeof user.$inferSelect | null> {
	const existingUser = await db.query.user.findFirst({
		where: eq(user.steamId, BigInt(steamId)),
	});

	return existingUser || null;
}

export async function getUserByDiscordId(
	discordId: string,
): Promise<typeof user.$inferSelect | null> {
	const existingUser = await db.query.user.findFirst({
		where: eq(user.discordId, BigInt(discordId)),
	});

	return existingUser || null;
}

export async function getUserSteamIdByDiscordId(discordId: string): Promise<bigint> {
	const steamId = await db
		.select({
			steamId: user.steamId,
		})
		.from(user)
		.where(eq(user.discordId, BigInt(discordId)))
		.limit(1)
		.then((rows) => rows[0]?.steamId);

	// If no user found, return -1
	if (!steamId) {
		return BigInt(-1);
	}

	return steamId;
}

export async function getOrInsertUser(steamId: string): Promise<typeof user.$inferSelect> {
	const existingUser = await getUser(steamId);

	// If user already exists, check if the name needs to be updated
	if (existingUser) {
		const { personaname: steamName } = await getSteamUser(steamId);

		if (existingUser.steamName !== steamName) {
			return updateUserName(steamId, steamName);
		}

		return existingUser;
	}

	console.debug(`Creating new user ${steamId}`);

	const { personaname: steamName } = await getSteamUser(steamId);
	const now = new Date().toISOString();

	const userData: typeof user.$inferInsert = {
		steamId: BigInt(steamId),
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

export async function getOrInsertUsersBulk(steamIds: string[]): Promise<Map<string, number>> {
	const existingUsers = await db
		.select({ id: user.id, steamId: user.steamId })
		.from(user)
		.where(inArray(user.steamId, steamIds.map(BigInt)));

	const idMap = new Map(existingUsers.map(user => [String(user.steamId), user.id]));

	const missing = steamIds.filter(id => !idMap.has(id));

	if (missing.length) {
		const now = new Date().toISOString();
		const steamProfiles: SteamUserData[] = [];

		for (const id of missing) {
			steamProfiles.push(await getSteamUser(id));
		}

		console.debug(`Inserting ${steamProfiles.length} new users`);

		const insertedUsers = await db.transaction(async (tx) => {
			const inserted = await tx.insert(user).values(
				steamProfiles.map(profile => ({
					steamId: BigInt(profile.steamid),
					steamName: profile.personaname,
					dateCreated: now,
					dateUpdated: now,
				}))
			).returning({ id: user.id, steamId: user.steamId });

			return inserted;
		});

		for (const newUser of insertedUsers) {
			idMap.set(String(newUser.steamId), newUser.id);
		}
	}

	return idMap;
}

export async function updateUserName(
	steamId: string,
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
			.where(eq(user.steamId, BigInt(steamId)))
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
	steamId: string,
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
			.where(eq(user.steamId, BigInt(steamId)))
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
	const users = await db.select({ idUser: user.id }).from(user).orderBy(asc(user.id));

	return users;
}
