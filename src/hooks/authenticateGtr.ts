import type { FastifyReply, FastifyRequest } from 'fastify';
import { ERROR_CODES, handleError, jwtProvider, verifyAccessToken } from '../utils';

export async function authenticateGtr(req: FastifyRequest, reply: FastifyReply) {
	// Split `Bearer <token>` to get the token
	const token = req.headers.authorization?.split(' ')[1];

	if (!token) {
		return reply.status(400).send(handleError(ERROR_CODES.AUTH_MISSING_TOKEN));
	}

	const verifiedToken = await verifyAccessToken(token);

	if (!verifiedToken || verifiedToken.provider !== jwtProvider.gtr) {
		return reply.status(401).send(handleError(ERROR_CODES.AUTH_INVALID_TOKEN));
	}

	req.user = verifiedToken;
}
