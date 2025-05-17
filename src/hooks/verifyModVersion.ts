import type { FastifyReply, FastifyRequest } from 'fastify';
import { isModOutdated } from '../services';
import { ERROR_CODES, getErrorMessage } from '../utils';

interface ModVersionBody {
	ModVersion: string;
}

export async function verifyModVersion(
	req: FastifyRequest<{ Body: ModVersionBody }>,
	reply: FastifyReply,
) {
	const { ModVersion } = req.body;
	const isOutdated = await isModOutdated(ModVersion);

	if (isOutdated) {
		reply.status(400).send({
			error: getErrorMessage(ERROR_CODES.AUTH_MOD_OUTDATED),
		});
	}
}
