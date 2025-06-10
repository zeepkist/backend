import { describe, expect, it } from 'bun:test';
import { getErrorMessage, ERROR_MESSAGES, ERROR_CODES } from './errors';

describe('getErrorMessage', () => {
	it('should return the correct error message for a given error code', () => {
		// loop through all error codes
		for (const key of Object.keys(ERROR_CODES) as Array<keyof typeof ERROR_CODES>) {
			const errorCode = ERROR_CODES[key];
			const expectedMessage = `${ERROR_MESSAGES[errorCode]}`;
			expect(getErrorMessage(errorCode)).toBe(expectedMessage);
		}
	});
});
