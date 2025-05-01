import { relations } from 'drizzle-orm/relations';
import {
	auth,
	favorite,
	level,
	levelItem,
	levelMetadata,
	levelPoints,
	personalBestGlobal,
	record,
	recordMedia,
	upvote,
	user,
	userPoints,
	vote,
	worldRecordGlobal,
} from './schema';

export const levelItemRelations = relations(levelItem, ({ one }) => ({
	level: one(level, {
		fields: [levelItem.idLevel],
		references: [level.id],
	}),
}));

export const levelRelations = relations(level, ({ many }) => ({
	levelItems: many(levelItem),
	levelMetadata: many(levelMetadata),
	levelPoints: many(levelPoints),
	personalBestGlobals: many(personalBestGlobal),
	records: many(record),
	upvotes: many(upvote),
	favorites: many(favorite),
	votes: many(vote),
	worldRecordGlobals: many(worldRecordGlobal),
}));

export const levelMetadataRelations = relations(levelMetadata, ({ one }) => ({
	level: one(level, {
		fields: [levelMetadata.idLevel],
		references: [level.id],
	}),
}));

export const levelPointsRelations = relations(levelPoints, ({ one }) => ({
	level: one(level, {
		fields: [levelPoints.idLevel],
		references: [level.id],
	}),
}));

export const personalBestGlobalRelations = relations(personalBestGlobal, ({ one }) => ({
	level: one(level, {
		fields: [personalBestGlobal.idLevel],
		references: [level.id],
	}),
	record: one(record, {
		fields: [personalBestGlobal.idRecord],
		references: [record.id],
	}),
	user: one(user, {
		fields: [personalBestGlobal.idUser],
		references: [user.id],
	}),
}));

export const recordRelations = relations(record, ({ one, many }) => ({
	personalBestGlobals: many(personalBestGlobal),
	level: one(level, {
		fields: [record.idLevel],
		references: [level.id],
	}),
	user: one(user, {
		fields: [record.idUser],
		references: [user.id],
	}),
	recordMedias: many(recordMedia),
	worldRecordGlobals: many(worldRecordGlobal),
}));

export const userRelations = relations(user, ({ many }) => ({
	personalBestGlobals: many(personalBestGlobal),
	userPoints: many(userPoints),
	auths: many(auth),
	records: many(record),
	upvotes: many(upvote),
	favorites: many(favorite),
	votes: many(vote),
}));

export const userPointsRelations = relations(userPoints, ({ one }) => ({
	user: one(user, {
		fields: [userPoints.idUser],
		references: [user.id],
	}),
}));

export const authRelations = relations(auth, ({ one }) => ({
	user: one(user, {
		fields: [auth.idUser],
		references: [user.id],
	}),
}));

export const recordMediaRelations = relations(recordMedia, ({ one }) => ({
	record: one(record, {
		fields: [recordMedia.idRecord],
		references: [record.id],
	}),
}));

export const upvoteRelations = relations(upvote, ({ one }) => ({
	level: one(level, {
		fields: [upvote.idLevel],
		references: [level.id],
	}),
	user: one(user, {
		fields: [upvote.idUser],
		references: [user.id],
	}),
}));

export const favoriteRelations = relations(favorite, ({ one }) => ({
	level: one(level, {
		fields: [favorite.idLevel],
		references: [level.id],
	}),
	user: one(user, {
		fields: [favorite.idUser],
		references: [user.id],
	}),
}));

export const voteRelations = relations(vote, ({ one }) => ({
	level: one(level, {
		fields: [vote.idLevel],
		references: [level.id],
	}),
	user: one(user, {
		fields: [vote.idUser],
		references: [user.id],
	}),
}));

export const worldRecordGlobalRelations = relations(worldRecordGlobal, ({ one }) => ({
	level: one(level, {
		fields: [worldRecordGlobal.idLevel],
		references: [level.id],
	}),
	record: one(record, {
		fields: [worldRecordGlobal.idRecord],
		references: [record.id],
	}),
}));
