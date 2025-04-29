import type { FastifyReply, FastifyRequest } from 'fastify';
import { ERROR_CODES, getErrorMessage, verifyAccessToken } from './';

export async function authenticateRequest<Body = unknown>(
	req: FastifyRequest<{ Body: Body }>,
	reply: FastifyReply,
	routeName: string,
) {
	console.log(`[${routeName}] Request received`);

	const token = req.headers.authorization?.split(' ')[1];

	if (!token) {
		reply.status(400).send({ error: getErrorMessage(ERROR_CODES.AUTH_MISSING_TOKEN) });
		throw new Error(getErrorMessage(ERROR_CODES.AUTH_MISSING_TOKEN));
	}

	const verifiedToken = await verifyAccessToken(token);

	if (!verifiedToken) {
		reply.status(401).send({ error: getErrorMessage(ERROR_CODES.AUTH_INVALID_TOKEN) });
		throw new Error(getErrorMessage(ERROR_CODES.AUTH_INVALID_TOKEN));
	}

	return verifiedToken;
}
