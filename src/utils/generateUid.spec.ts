import { describe, expect, it } from 'bun:test';
import { generateUid } from './generateUid';

describe('generateUid', () => {
	it('should generate a unique ID', () => {
		const id1 = generateUid();
		const id2 = generateUid();
		expect(id1).not.toBe(id2);
	});

	it('should generate a valid ULID', () => {
		const id = generateUid();
		expect(id).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/);
	});
});
