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
};

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export type ErrorMessage = (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES];

export function getErrorMessage(code: ErrorCode): ErrorMessage {
	const message = ERROR_MESSAGES[code];
	if (!message) {
		throw new Error(`Unknown error code: ${code}`);
	}

	const errorMessage = `${message} (ERR #${code})`;

	console.error(errorMessage);
	return errorMessage;
}
