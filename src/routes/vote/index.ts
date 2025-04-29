import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { getOrInsertLevel, getOrInsertUser, upsertVote } from '../../services';
import { ERROR_CODES, authenticateRequest, getErrorMessage } from '../../utils';

type VoteType = -2 | -1 | 1 | 2;

interface VoteBody {
	Level: string;
}

const handleVoteRequest = async (
	req: FastifyRequest<{ Body: VoteBody }>,
	reply: FastifyReply,
	value: VoteType,
) => {
	try {
		const { steamid } = await authenticateRequest(req, reply, req.url);
		const { Level } = req.body;

		if (!Level) {
			return reply
				.status(400)
				.send({ error: getErrorMessage(ERROR_CODES.VOTE_MISSING_PARAMS) });
		}

		const level = await getOrInsertLevel(Level);

		if (!level) {
			return reply.status(400).send({ error: getErrorMessage(ERROR_CODES.LEVEL_NOT_FOUND) });
		}

		const user = await getOrInsertUser(steamid);

		await upsertVote(user.id, level.id, value);

		return reply.status(200).send();
	} catch (error) {
		if (!reply.sent) {
			console.error('Error handling vote request:', error);
			return reply
				.status(500)
				.send({ error: getErrorMessage(ERROR_CODES.INTERNAL_SERVER_ERROR) });
		}
	}
};

export const voteRoutes: FastifyPluginAsync = async (app) => {
	// User votes ++ on level
	app.post<{ Body: VoteBody }>(
		'/dupvote',
		async (req, reply) => await handleVoteRequest(req, reply, 2),
	);

	// User votes + on level
	app.post<{ Body: VoteBody }>(
		'/upvote',
		async (req, reply) => await handleVoteRequest(req, reply, 1),
	);

	// User votes - on level
	app.post<{ Body: VoteBody }>(
		'/downvote',
		async (req, reply) => await handleVoteRequest(req, reply, -1),
	);

	// User votes -- on level
	app.post<{ Body: VoteBody }>(
		'/ddownvote',
		async (req, reply) => await handleVoteRequest(req, reply, -2),
	);
};
