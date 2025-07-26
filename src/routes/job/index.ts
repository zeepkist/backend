import type { FastifyPluginAsync, FastifySchema } from 'fastify';
import { authenticateJob } from '../../hooks';
import { ERROR_CODES, handleError, errorSchema } from '../../utils';
import { addJob } from '../../jobs';

interface SubmitBody {
	Task: string;
	Options: Record<string, unknown>;
}

const jobTriggerSchema: FastifySchema = {
	tags: ['Job'],
	operationId: 'triggerJob',
	summary: 'Trigger a job',
	description: 'Allows authorized jobs to be triggered with specific options.',
	produces: ['application/json'],
	consumes: ['application/json'],
	security: [{ Job: [] }],
	body: {
		type: 'object',
		required: ['Task', 'Options'],
		properties: {
			Task: {
				type: 'string',
				description: 'Name of the job task to be triggered',
			},
			Options: {
				type: 'object',
				description: 'Options for the job task',
				additionalProperties: true,
			},
		},
		examples: [
			{
				Task: 'exampleTask',
				Options: {
					option1: 'value1',
					option2: 'value2',
				},
			},
		],
	},
	response: {
		200: {
			type: 'object',
			properties: {},
		},
		400: errorSchema(ERROR_CODES.GENERIC_INVALID_REQUEST),
		401: errorSchema(ERROR_CODES.AUTH_INVALID_TOKEN),
		500: errorSchema(ERROR_CODES.INTERNAL_SERVER_ERROR),
	}
}

export const jobRoutes: FastifyPluginAsync = async (app) => {
	app.post<{ Body: SubmitBody }>(
		'/trigger',
		{
			preValidation: [authenticateJob],
			schema: jobTriggerSchema,
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
