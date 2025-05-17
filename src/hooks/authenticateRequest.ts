import type { FastifyReply, FastifyRequest } from 'fastify';
import { ERROR_CODES, getErrorMessage, verifyAccessToken } from '../utils';

export async function authenticateRequest(req: FastifyRequest, reply: FastifyReply) {
	// Split `Bearer <token>` to get the token
	const token = req.headers.authorization?.split(' ')[1];

	if (!token) {
		return reply.status(400).send({
			error: getErrorMessage(ERROR_CODES.AUTH_MISSING_TOKEN),
		});
	}

	const verifiedToken = await verifyAccessToken(token);

	if (!verifiedToken) {
		return reply.status(401).send({
			error: getErrorMessage(ERROR_CODES.AUTH_INVALID_TOKEN),
		});
	}

	req.user = verifiedToken;
}
