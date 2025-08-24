import type { FastifyReply, FastifyRequest } from 'fastify';
import { isModOutdated } from '../services';
import { ERROR_CODES, handleError } from '../utils';

interface ModVersionBody {
	ModVersion: string;
	SteamId?: string;
}

export async function verifyModVersion(
	req: FastifyRequest<{ Body: ModVersionBody }>,
	reply: FastifyReply,
) {
	if (!req.body || !req.body.ModVersion) {
		reply.status(400).send(handleError(ERROR_CODES.GENERIC_INVALID_REQUEST));
		return;
	}

	const { ModVersion, SteamId } = req.body;

	const isOutdated = await isModOutdated(String(ModVersion), String(SteamId));

	if (isOutdated) {
		reply.status(400).send(handleError(ERROR_CODES.AUTH_MOD_OUTDATED));
	}
}
