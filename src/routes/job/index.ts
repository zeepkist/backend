import type { FastifyPluginAsync } from 'fastify';
import { authenticateJob } from '../../hooks';
import { ERROR_CODES, handleError } from '../../utils';
import { addJob } from '../../jobs';

interface SubmitBody {
	Task: string;
	Options: Record<string, unknown>;
}

export const jobRoutes: FastifyPluginAsync = async (app) => {
	app.post<{ Body: SubmitBody }>(
		'/trigger',
		{
			preValidation: [authenticateJob],
		},
		async (req, reply) => {
			try {
				const { authorisedJob } = req;

				if (!authorisedJob) {
					return reply.status(401).send(handleError(ERROR_CODES.AUTH_INVALID_TOKEN));
				}

				const { Task, Options } = req.body;

				if (!Task || !Options) {
					return reply.status(400).send(handleError(ERROR_CODES.GENERIC_INVALID_REQUEST));
				}

				app.log.info(`Job triggered: ${Task} with options`, Options);
				await addJob(Task, Options);
			} catch (error) {
				if (!reply.sent) {
					console.trace('Error handling job request:', error);
					return reply.status(500).send(handleError(ERROR_CODES.INTERNAL_SERVER_ERROR));
				}
			}
		},
	);
};
