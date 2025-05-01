import {
	bigint,
	boolean,
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	real,
	text,
	timestamp,
	unique,
	uniqueIndex,
	varchar,
} from 'drizzle-orm/pg-core';

export const versionInfo = pgTable(
	'VersionInfo',
	{
		version: bigint('Version', { mode: 'bigint' }).notNull(),
		appliedOn: timestamp('AppliedOn', { mode: 'string' }),
		description: varchar('Description', { length: 1024 }),
	},
	(table) => [
		uniqueIndex('UC_Version').using('btree', table.version.asc().nullsLast().op('int8_ops')),
	],
);

export const level = pgTable(
	'level',
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity({
			name: 'level_id_seq',
			startWith: 1,
			increment: 1,
			minValue: 1,
			maxValue: 2147483647,
			cache: 1,
		}),
		hash: text().notNull(),
		dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
		dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
	},
	(table) => [unique('level_pk').on(table.hash)],
);

export const levelItem = pgTable(
	'level_item',
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity({
			name: 'level_item_id_seq',
			startWith: 1,
			increment: 1,
			minValue: 1,
			maxValue: 2147483647,
			cache: 1,
		}),
		idLevel: integer('id_level').notNull(),
		workshopId: numeric('workshop_id').notNull(),
		authorId: numeric('author_id').notNull(),
		name: text().notNull(),
		imageUrl: text('image_url').notNull(),
		fileAuthor: text('file_author').notNull(),
		fileUid: text('file_uid').notNull(),
		validationTimeAuthor: real('validation_time_author').notNull(),
		validationTimeGold: real('validation_time_gold').notNull(),
		validationTimeSilver: real('validation_time_silver').notNull(),
		validationTimeBronze: real('validation_time_bronze').notNull(),
		deleted: boolean().notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
		dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
		dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
	},
	(table) => [
		index('IX_level_item_level').using('btree', table.idLevel.asc()),
		foreignKey({
			columns: [table.idLevel],
			foreignColumns: [level.id],
			name: 'level_item_id_level_fkey',
		}),
	],
);

export const levelMetadata = pgTable(
	'level_metadata',
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity({
			name: 'level_metadata_id_seq',
			startWith: 1,
			increment: 1,
			minValue: 1,
			maxValue: 2147483647,
			cache: 1,
		}),
		idLevel: integer('id_level').notNull(),
		amountCheckpoints: integer('amount_checkpoints').notNull(),
		amountFinishes: integer('amount_finishes').notNull(),
		amountBlocks: integer('amount_blocks').notNull(),
		typeGround: integer('type_ground').notNull(),
		typeSkybox: integer('type_skybox').notNull(),
		blocks: jsonb().notNull(),
		dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
		dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
	},
	(table) => [
		index('IX_level_metadata_level').using('btree', table.idLevel.asc()),
		foreignKey({
			columns: [table.idLevel],
			foreignColumns: [level.id],
			name: 'level_metadata_id_level_fkey',
		}),
	],
);

export const levelPoints = pgTable(
	'level_points',
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity({
			name: 'level_points_id_seq',
			startWith: 1,
			increment: 1,
			minValue: 1,
			maxValue: 2147483647,
			cache: 1,
		}),
		points: integer().notNull(),
		idLevel: integer('id_level').notNull(),
		dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
		dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
	},
	(table) => [
		uniqueIndex('UQ_level_points_level').on(table.idLevel.asc()),
		foreignKey({
			columns: [table.idLevel],
			foreignColumns: [level.id],
			name: 'level_points_level_fkey',
		}),
	],
);

export const levelRequest = pgTable(
	'level_request',
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity({
			name: 'requests_id_seq',
			startWith: 1,
			increment: 1,
			minValue: 1,
			maxValue: 2147483647,
			cache: 1,
		}),
		workshopId: numeric('workshop_id').notNull(),
		uid: text(),
		hash: text(),
		dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
		dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
	},
	(table) => [
		index('IX_level_request_workshop_id').using('btree', table.workshopId.asc()),
		index('IX_level_request_hash').using('btree', table.hash.asc()),
	],
);

export const personalBestGlobal = pgTable(
	'personal_best_global',
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity({
			name: 'personal_bests_id_seq',
			startWith: 1,
			increment: 1,
			minValue: 1,
			maxValue: 2147483647,
			cache: 1,
		}),
		idRecord: integer('id_record').notNull(),
		idUser: integer('id_user').notNull(),
		idLevel: integer('id_level').notNull(),
		dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
		dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
	},
	(table) => [
		index('IX_personal_bests_record').using(
			'btree',
			table.idRecord.asc().nullsLast().op('int4_ops'),
		),
		index('IX_personal_bests_user').using(
			'btree',
			table.idUser.asc().nullsLast().op('int4_ops'),
		),
		index('IX_personal_bests_level_user').using(
			'btree',
			table.idLevel.asc().nullsLast().op('int4_ops'),
			table.idUser.asc().nullsLast().op('int4_ops'),
		),
		index('IX_personal_bests_user_level_record').using(
			'btree',
			table.idUser.asc().nullsLast().op('int4_ops'),
			table.idLevel.asc().nullsLast().op('int4_ops'),
			table.idRecord.asc().nullsLast().op('int4_ops'),
		),
		foreignKey({
			columns: [table.idLevel],
			foreignColumns: [level.id],
			name: 'personal_best_global_level_fkey',
		}),
		foreignKey({
			columns: [table.idRecord],
			foreignColumns: [record.id],
			name: 'personal_bests_global_record_fkey',
		}),
		foreignKey({
			columns: [table.idUser],
			foreignColumns: [user.id],
			name: 'personal_bests_global_user_fkey',
		}),
	],
);

export const userPoints = pgTable(
	'user_points',
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity({
			name: 'player_points_id_seq',
			startWith: 1,
			increment: 1,
			minValue: 1,
			maxValue: 2147483647,
			cache: 1,
		}),
		idUser: integer('id_user').notNull(),
		points: integer().notNull().default(0),
		totalPoints: integer('total_points').notNull().default(0),
		dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
		dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
		rank: integer().default(0).notNull(),
		worldRecords: integer('world_records').default(0),
	},
	(table) => [
		index('IX_player_points_user').using(
			'btree',
			table.idUser.asc().nullsLast().op('int4_ops'),
		),
		foreignKey({
			columns: [table.idUser],
			foreignColumns: [user.id],
			name: 'player_points_user_fkey',
		}).onDelete('set null'),
	],
);

export const auth = pgTable(
	'auth',
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity({
			name: 'auth_id_seq',
			startWith: 1,
			increment: 1,
			minValue: 1,
			maxValue: 2147483647,
			cache: 1,
		}),
		idUser: integer('id_user'),
		accessToken: text('access_token'),
		accessTokenExpiry: bigint('access_token_expiry', { mode: 'bigint' }),
		refreshToken: text('refresh_token'),
		refreshTokenExpiry: bigint('refresh_token_expiry', { mode: 'bigint' }),
		type: integer(),
		dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
		dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
	},
	(table) => [
		index('IX_auth_user').using('btree', table.idUser.asc().nullsLast().op('int4_ops')),
		foreignKey({
			columns: [table.idUser],
			foreignColumns: [user.id],
			name: 'auth_user_foreign',
		}).onDelete('set null'),
	],
);

export const record = pgTable(
	'record',
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity({
			name: 'records_id_seq',
			startWith: 1,
			increment: 1,
			minValue: 1,
			maxValue: 2147483647,
			cache: 1,
		}),
		idUser: integer('id_user').notNull(),
		time: real().notNull(),
		gameVersion: varchar('game_version', { length: 255 }).notNull(),
		idLevel: integer('id_level').notNull(),
		modVersion: varchar('mod_version', { length: 255 }).notNull(),
		dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
		dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
		splits: real().array(),
		speeds: real().array(),
	},
	(table) => [
		index('IX_records_user').using('btree', table.idUser.asc().nullsLast().op('int4_ops')),
		index('IX_records_level').using('btree', table.idLevel.asc()),
		index('IX_records_level_time').using('btree', table.idLevel.asc(), table.time.asc()),
		index('IX_records_id_time').on(table.idLevel.asc(), table.time.asc()),
		index('IX_records_time_id').on(table.time.asc(), table.idLevel.asc()),
		foreignKey({
			columns: [table.idLevel],
			foreignColumns: [level.id],
			name: 'record_level_fkey',
		}),
		foreignKey({
			columns: [table.idUser],
			foreignColumns: [user.id],
			name: 'records_user_foreign',
		}).onDelete('set null'),
	],
);

export const recordMedia = pgTable(
	'record_media',
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity({
			name: 'media_id_seq',
			startWith: 1,
			increment: 1,
			minValue: 1,
			maxValue: 2147483647,
			cache: 1,
		}),
		idRecord: integer('id_record').notNull(),
		ghostUrl: text('ghost_url'),
		dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
		dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
	},
	(table) => [
		index('IX_media_record').using('btree', table.idRecord.asc().nullsLast().op('int4_ops')),
		unique('UQ_record_media_record').on(table.idRecord),
		foreignKey({
			columns: [table.idRecord],
			foreignColumns: [record.id],
			name: 'media_record_fkey',
		}),
	],
);

export const upvote = pgTable(
	'upvote',
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity({
			name: 'upvotes_id_seq',
			startWith: 1,
			increment: 1,
			minValue: 1,
			maxValue: 2147483647,
			cache: 1,
		}),
		idUser: integer('id_user').notNull(),
		idLevel: integer('id_level').notNull(),
		dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
		dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
	},
	(table) => [
		index('IX_upvotes_user').using('btree', table.idUser.asc().nullsLast().op('int4_ops')),
		foreignKey({
			columns: [table.idLevel],
			foreignColumns: [level.id],
			name: 'upvote_level_fkey',
		}),
		foreignKey({
			columns: [table.idUser],
			foreignColumns: [user.id],
			name: 'upvotes_user_foreign',
		}).onDelete('set null'),
	],
);

export const user = pgTable('user', {
	id: integer().primaryKey().generatedByDefaultAsIdentity({
		name: 'users_id_seq',
		startWith: 1,
		increment: 1,
		minValue: 1,
		maxValue: 2147483647,
		cache: 1,
	}),
	steamName: varchar('steam_name', { length: 255 }),
	banned: boolean().default(false).notNull(),
	dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
	dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
	steamId: numeric('steam_id'),
	discordId: numeric('discord_id'),
});

export const version = pgTable('version', {
	id: integer().primaryKey().generatedAlwaysAsIdentity({
		name: 'versions_id_seq',
		startWith: 1,
		increment: 1,
		minValue: 1,
		maxValue: 2147483647,
		cache: 1,
	}),
	minimum: text(),
	latest: text(),
	dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
	dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
});

export const favorite = pgTable(
	'favorite',
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity({
			name: 'favorites_id_seq',
			startWith: 1,
			increment: 1,
			minValue: 1,
			maxValue: 2147483647,
			cache: 1,
		}),
		idUser: integer('id_user').notNull(),
		dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
		dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
		idLevel: integer('id_level').notNull(),
	},
	(table) => [
		index('IX_favorites_user').using('btree', table.idUser.asc().nullsLast().op('int4_ops')),
		index('IX_favorites_level').using('btree', table.idLevel.asc()),
		foreignKey({
			columns: [table.idLevel],
			foreignColumns: [level.id],
			name: 'favorite_level_fkey',
		}),
		foreignKey({
			columns: [table.idUser],
			foreignColumns: [user.id],
			name: 'favorites_user_foreign',
		}).onDelete('set null'),
	],
);

export const vote = pgTable(
	'vote',
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity({
			name: 'vote_id_seq',
			startWith: 1,
			increment: 1,
			minValue: 1,
			maxValue: 2147483647,
			cache: 1,
		}),
		idUser: integer('id_user').notNull(),
		idLevel: integer('id_level').notNull(),
		value: integer().notNull(),
		dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
		dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
	},
	(table) => [
		index('IX_vote_user_level').using('btree', table.idUser.asc(), table.idLevel.asc()),
		foreignKey({
			columns: [table.idLevel],
			foreignColumns: [level.id],
			name: 'vote_id_level_fkey',
		}),
		foreignKey({
			columns: [table.idUser],
			foreignColumns: [user.id],
			name: 'vote_id_user_fkey',
		}),
	],
);

export const worldRecordGlobal = pgTable(
	'world_record_global',
	{
		id: integer().primaryKey().generatedByDefaultAsIdentity({
			name: 'world_records_id_seq',
			startWith: 1,
			increment: 1,
			minValue: 1,
			maxValue: 2147483647,
			cache: 1,
		}),
		idRecord: integer('id_record').notNull(),
		idLevel: integer('id_level').notNull(),
		dateCreated: timestamp('date_created', { withTimezone: true, mode: 'string' }).notNull(),
		dateUpdated: timestamp('date_updated', { withTimezone: true, mode: 'string' }),
	},
	(table) => [
		index('IX_world_records_record').using(
			'btree',
			table.idRecord.asc().nullsLast().op('int4_ops'),
		),
		foreignKey({
			columns: [table.idLevel],
			foreignColumns: [level.id],
			name: 'world_record_global_level_fkey',
		}),
		foreignKey({
			columns: [table.idRecord],
			foreignColumns: [record.id],
			name: 'world_records_global_record_fkey',
		}),
	],
);
