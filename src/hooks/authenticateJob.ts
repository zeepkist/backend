import type { FastifyReply, FastifyRequest } from 'fastify';
import { TRIGGER_JOB_TOKEN } from '../config';
import { ERROR_CODES, handleError } from '../utils';

export async function authenticateJob(req: FastifyRequest, reply: FastifyReply) {
	// Split `Bearer <token>` to get the token
	const token = req.headers.authorization?.split(' ')[1];

	if (!token) {
		return reply.status(400).send(handleError(ERROR_CODES.AUTH_MISSING_TOKEN));
	}

	if (token !== TRIGGER_JOB_TOKEN) {
		return reply.status(401).send(handleError(ERROR_CODES.AUTH_INVALID_TOKEN));
	}

	req.authorisedJob = true;
}
