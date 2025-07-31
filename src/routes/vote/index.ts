import type { FastifyPluginAsync, FastifyReply, FastifyRequest, FastifySchema } from 'fastify';
import { authenticateGtr, authenticateRequest } from '../../hooks';
import { getLevel, getUser, upsertVote } from '../../services';
import type { VoteValue } from '../../types/enums';
import { ERROR_CODES, errorSchema, handleError } from '../../utils';

interface VoteBody {
	Level: string;
	Value: VoteValue;
}

interface VoteBodyDeprecated extends Omit<VoteBody, 'Value'> {
	Value?: VoteValue; // Optional for deprecated routes
}

const voteSchema: FastifySchema = {
	tags: ['Vote'],
	operationId: 'voteOnLevel',
	summary: 'Vote on a level',
	description: 'Allows users to vote on a level with a specific value.',
	produces: ['application/json'],
	consumes: ['application/json'],
	security: [{ Web: [], GTR: [] }],
	body: {
		type: 'object',
		required: ['Level', 'Value'],
		properties: {
			Level: {
				type: 'string',
				description: 'Level hash of the level being voted on',
			},
			Value: {
				type: 'integer',
				enum: [-2, -1, 0, 1, 2],
				description: 'Vote value: -2 for --, -1 for -, 0 for -+/+-, 1 for +, 2 for ++',
			},
		},
		examples: [
			{
				Level: '61C096367AFC76A1D2E8024AA638F516912444CC',
				Value: 2, // Example of a ++ vote
			},
		],
	},
	response: {
		200: {},
		400: errorSchema(ERROR_CODES.AUTH_MISSING_TOKEN),
		401: errorSchema(ERROR_CODES.AUTH_INVALID_TOKEN),
		500: errorSchema(ERROR_CODES.INTERNAL_SERVER_ERROR),
	},
};

const voteSchemaDeprecated = (operationId: string, value: string): FastifySchema => ({
	deprecated: true,
	tags: ['Vote'],
	operationId,
	summary: `Vote on a level with ${value}`,
	description: `Allows users to vote on a level with a ${value}.`,
	produces: ['application/json'],
	consumes: ['application/json'],
	security: [{ GTR: [] }],
	body: {
		type: 'object',
		required: ['Level'],
		properties: {
			Level: {
				type: 'string',
				description: 'Level hash of the level being voted on',
			},
		},
		examples: [
			{
				Level: '61C096367AFC76A1D2E8024AA638F516912444CC',
				// Value will be set by the route handler
			},
		],
	},
	response: {
		200: {},
		400: errorSchema(ERROR_CODES.AUTH_MISSING_TOKEN),
		401: errorSchema(ERROR_CODES.AUTH_INVALID_TOKEN),
		500: errorSchema(ERROR_CODES.INTERNAL_SERVER_ERROR),
	},
});

const handleVoteRequest = async (
	req: FastifyRequest<{ Body: VoteBody | VoteBodyDeprecated }>,
	reply: FastifyReply,
) => {
	try {
		const { user: authUser } = req;

		if (!authUser) {
			return reply.status(401).send(handleError(ERROR_CODES.AUTH_USER_NOT_FOUND));
		}

		const { Level, Value } = req.body;

		if (!Level || Value === undefined) {
			return reply.status(400).send(handleError(ERROR_CODES.VOTE_MISSING_PARAMS));
		}

		const user = await getUser(authUser.steamid);

		if (!user) {
			return reply.status(401).send(handleError(ERROR_CODES.AUTH_USER_NOT_FOUND));
		}

		const level = await getLevel(Level);

		if (!level) {
			return reply.status(400).send(handleError(ERROR_CODES.LEVEL_NOT_FOUND));
		}

		await upsertVote(user.id, level.id, Value);

		return reply.status(200).send();
	} catch (error) {
		if (!reply.sent) {
			console.error('Error handling vote request:', error);
			return reply.status(500).send(handleError(ERROR_CODES.INTERNAL_SERVER_ERROR, error));
		}
	}
};

export const voteRoutes: FastifyPluginAsync = async (app) => {
	app.post<{ Body: VoteBody }>(
		'/submit',
		{
			preValidation: [authenticateRequest],
			schema: voteSchema,
		},
		async (req, reply) => await handleVoteRequest(req, reply),
	);

	/**
	 * Handle ++ vote request for level
	 *
	 * @deprecated Use `/vote` instead with `Value` set to `2`
	 */
	app.post<{ Body: VoteBodyDeprecated }>(
		'/dupvote',
		{
			preValidation: [authenticateGtr],
			schema: voteSchemaDeprecated('voteOnLevelDoubleUpvotevote', '++'),
		},
		async (req, reply) => {
			req.body.Value = 2; // Set default value for upvote
			await handleVoteRequest(req, reply);
		},
	);

	/**
	 * Handle + vote request for level
	 *
	 * @deprecated Use `/vote` instead with `Value` set to `1`
	 */
	app.post<{ Body: VoteBodyDeprecated }>(
		'/upvote',
		{
			preValidation: [authenticateGtr],
			schema: voteSchemaDeprecated('voteOnLevelUpvotevote', '+'),
		},
		async (req, reply) => {
			req.body.Value = 1; // Set default value for upvote
			await handleVoteRequest(req, reply);
		},
	);

	/**
	 * Handle - vote request for level
	 *
	 * @deprecated Use `/vote` instead with `Value` set to `-1`
	 */
	app.post<{ Body: VoteBodyDeprecated }>(
		'/downvote',
		{
			preValidation: [authenticateGtr],
			schema: voteSchemaDeprecated('voteOnLevelDownvote', '-'),
		},
		async (req, reply) => {
			req.body.Value = -1; // Set default value for downvote
			await handleVoteRequest(req, reply);
		},
	);

	/**
	 * Handle -- vote request for level
	 *
	 * @deprecated Use `/vote` instead with `Value` set to `-2`
	 */
	app.post<{ Body: VoteBodyDeprecated }>(
		'/ddownvote',
		{
			preValidation: [authenticateGtr],
			schema: voteSchemaDeprecated('voteOnLevelDoubleDownvote', '--'),
		},
		async (req, reply) => {
			req.body.Value = -2; // Set default value for double downvote
			await handleVoteRequest(req, reply);
		},
	);
};
