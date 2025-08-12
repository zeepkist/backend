import type { FastifySchema } from 'fastify';
import { trace } from "@opentelemetry/api"
import { OPENTELEMETRY_SERVICE_NAME } from '../config';

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export type ErrorMessage = (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES];

interface GetErrorMessageOptions {
	isConsole?: boolean;
	reportError?: boolean;
	error?: unknown;
}

interface ErrorResponse {
	error: {
		message: ErrorMessage;
		code: ErrorCode;
		details?: string[];
	};
}

const OPENTELEMETRY_ATTRIBUTES = {
	errorCode: `${OPENTELEMETRY_SERVICE_NAME}.error.code`,
	errorMessage: `${OPENTELEMETRY_SERVICE_NAME}.error.message`,
}

export const ERROR_CODES = {
	INTERNAL_SERVER_ERROR: 0,
	// Steam Authentication errors
	STEAM_AUTH_REQUEST_FAILED: 1,
	STEAM_AUTH_FAILED: 2,
	STEAM_PUBLISHER_BANNED: 3,
	STEAM_VAC_BANNED: 4,
	STEAM_NOT_OWNER: 5,
	STEAM_ID_MISMATCH: 6,
	STEAM_UNKNOWN_ERROR: 7,
	// General Authentication errors
	AUTH_MISSING_REQUIRED_FIELDS: 8,
	AUTH_MOD_OUTDATED: 9,
	AUTH_STEAM_ID_MISMATCH: 10,
	AUTH_STEAM_AUTHENTICATION_FAILED: 11,
	AUTH_MISSING_TOKEN: 14,
	AUTH_INVALID_TOKEN: 15,
	AUTH_USER_NOT_FOUND: 16,
	AUTH_INVALID_PROVIDER: 23,
	AUTH_DISCORD_NOT_LINKED: 24,
	// Steam User errors
	STEAM_USER_REQUEST_FAILED: 12,
	STEAM_USER_NOT_FOUND: 13,
	// Vote errors
	VOTE_MISSING_PARAMS: 17,
	// Level errors
	LEVEL_NOT_FOUND: 18,
	// Record errors
	RECORD_SUBMIT_MISSING_PARAMS: 19,
	RECORD_SUBMIT_FAILED: 20,
	GENERIC_NOT_FOUND: 21,
	GENERIC_INVALID_REQUEST: 22,
} as const;

export const ERROR_MESSAGES = {
	[ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Internal server error',
	// Steam Authentication errors
	[ERROR_CODES.STEAM_AUTH_REQUEST_FAILED]: 'Steam API request failed',
	[ERROR_CODES.STEAM_AUTH_FAILED]: 'Unable to authenticate with Steam',
	[ERROR_CODES.STEAM_PUBLISHER_BANNED]: 'User is publisher banned',
	[ERROR_CODES.STEAM_VAC_BANNED]: 'User is VAC banned',
	[ERROR_CODES.STEAM_NOT_OWNER]: 'User is not the owner of the game',
	[ERROR_CODES.STEAM_ID_MISMATCH]: 'Steam ID mismatch',
	[ERROR_CODES.STEAM_UNKNOWN_ERROR]: 'Error authenticating with Steam',
	// General Authentication errors
	[ERROR_CODES.AUTH_MISSING_REQUIRED_FIELDS]: 'Missing required fields',
	[ERROR_CODES.AUTH_MOD_OUTDATED]: 'Mod version is outdated',
	[ERROR_CODES.AUTH_STEAM_ID_MISMATCH]: 'Steam ID mismatch',
	[ERROR_CODES.AUTH_STEAM_AUTHENTICATION_FAILED]: 'Steam authentication failed',
	[ERROR_CODES.AUTH_MISSING_TOKEN]: 'Not authenticated',
	[ERROR_CODES.AUTH_INVALID_TOKEN]: 'Invalid or expired token',
	[ERROR_CODES.AUTH_USER_NOT_FOUND]: 'User not found',
	[ERROR_CODES.AUTH_INVALID_PROVIDER]: 'Invalid authentication provider',
	[ERROR_CODES.AUTH_DISCORD_NOT_LINKED]: 'Discord account not linked',
	// Steam User errors
	[ERROR_CODES.STEAM_USER_REQUEST_FAILED]: 'Steam user request failed',
	[ERROR_CODES.STEAM_USER_NOT_FOUND]: 'Steam user not found',
	// Vote errors
	[ERROR_CODES.VOTE_MISSING_PARAMS]: 'Missing required parameters',
	// Level errors
	[ERROR_CODES.LEVEL_NOT_FOUND]: 'Level not found',
	// Record errors
	[ERROR_CODES.RECORD_SUBMIT_MISSING_PARAMS]: 'Missing required parameters',
	[ERROR_CODES.RECORD_SUBMIT_FAILED]: 'Failed to submit record',
	[ERROR_CODES.GENERIC_INVALID_REQUEST]: 'Invalid request',
	[ERROR_CODES.GENERIC_NOT_FOUND]: 'Not found',
};

export function getErrorMessage(code: ErrorCode, options?: GetErrorMessageOptions): ErrorMessage {
	const message = ERROR_MESSAGES[code];

	if (!message) {
		throw new Error(`Unknown error code: ${code}`);
	}

	const errorMessage = options?.isConsole ? `${message} (ERR #${code})` : message;

	if (options?.reportError !== false) {
		console.trace(`Error Code: ${code}, Message: ${errorMessage}`, options?.error);

		const span = trace.getActiveSpan();
		if (span) {
			span.setAttribute(OPENTELEMETRY_ATTRIBUTES.errorCode, code.toString());
			span.setAttribute(OPENTELEMETRY_ATTRIBUTES.errorMessage, message);

			if (options?.error) {
				span.recordException(
					options.error instanceof Error
						? options.error
						: new Error(String(options.error))
				);
			}

			span.setStatus({
				code: 2, // Error status
				message: errorMessage,
			});
		}
	}

	return errorMessage;
}

export function handleError(code: ErrorCode, error?: unknown): ErrorResponse {
	const message = getErrorMessage(code, {
		isConsole: false,
		error,
	});

	return {
		error: {
			code,
			message,
		},
	};
}

/**
 * Generates an error schema for Fastify Swagger documentation.
 */
export function errorSchema(code: ErrorCode): FastifySchema['response'] {
	return {
		type: 'object',
		properties: {
			error: {
				type: 'object',
				properties: {
					code: { type: 'string', enum: [code.toString()] },
					message: {
						type: 'string',
						enum: [getErrorMessage(code, { reportError: false })],
					},
				},
				required: ['code', 'message'],
			},
		},
	};
}
