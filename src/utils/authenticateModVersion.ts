import type { FastifyReply, FastifyRequest } from 'fastify';
import { isModOutdated } from '../services';
import { ERROR_CODES, getErrorMessage } from './';

interface ModVersionBody {
	ModVersion: string;
}

export async function authenticateModVersion(
	req: FastifyRequest<{ Body: ModVersionBody }>,
	reply: FastifyReply,
	routeName: string,
) {
	console.log(`[${routeName}] Request received`);

	const { ModVersion } = req.body;
	const isOutdated = await isModOutdated(ModVersion);

	if (isOutdated) {
		reply.status(400).send({ error: getErrorMessage(ERROR_CODES.AUTH_MOD_OUTDATED) });
		throw new Error(getErrorMessage(ERROR_CODES.AUTH_MOD_OUTDATED));
	}

	return true;
}
