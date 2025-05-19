import { describe, expect, it, spyOn } from 'bun:test';
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from './jwt.ts';

describe('generateAccessToken', () => {
	it('should generate a valid access token', async () => {
		const steamId = '12345678901234567';
		const { accessToken, accessTokenExpiry } = await generateAccessToken(steamId);
		expect(accessToken).toBeString();
		expect(accessTokenExpiry).toBeGreaterThan(BigInt(Date.now()) / 1000n);

		const [header, payload, signature] = accessToken.split('.');

		expect(header).toBeString();
		expect(payload).toBeString();
		expect(signature).toBeString();

		const decodedHeader = JSON.parse(atob(header || ''));
		const decodedPayload = JSON.parse(atob(payload || ''));

		expect(header).toHaveLength(36);
		expect(decodedHeader).toEqual({
			alg: 'HS256',
			typ: 'JWT'
		});

		expect(decodedPayload).toEqual({
			aud: 'zeepki.st',
			exp: expect.any(Number),
			iat: expect.any(Number),
			iss: 'https://zeepki.st',
			jti: expect.any(String),
			sub: steamId,
			steamid: steamId,
		});

		expect(decodedPayload.exp).toBeGreaterThan(Date.now() / 1000);
		expect(decodedPayload.iat).toBeLessThan(Date.now() / 1000);
		expect(decodedPayload.iat).toBeGreaterThan(decodedPayload.exp - 60 * 60);

		expect(decodedPayload.sub).toBe(steamId);
		expect(decodedPayload.steamid).toBe(decodedPayload.sub);
	});

	it('should generate a valid refresh token', () => {
		const { refreshToken, refreshTokenExpiry } = generateRefreshToken();
		expect(refreshToken).toBeString();
		expect(refreshTokenExpiry).toBeGreaterThan(BigInt(Date.now()) / 1000n);
		expect(refreshToken).toHaveLength(36);
	})
});


describe('verifyAccessToken', () => {
	it('should verify a valid access token', async () => {
		const steamId = '12345678901234567';
		const { accessToken } = await generateAccessToken(steamId);
		const verifiedPayload = await verifyAccessToken(accessToken);
		expect(verifiedPayload).toBeObject();
		expect(verifiedPayload).toEqual({
			aud: 'zeepki.st',
			exp: expect.any(Number),
			iat: expect.any(Number),
			iss: 'https://zeepki.st',
			jti: expect.any(String),
			sub: steamId,
			steamid: BigInt(steamId),
		});
	});

	it.skip('should return null for non-jwt inputs', async () => {
		const invalidAccessToken = 'invalid.token.string';
		const verifiedPayload = await verifyAccessToken(invalidAccessToken);
		expect(verifiedPayload).toBeNull();
	});

	it.skip('should return null for an expired access token', async () => {
		const { accessToken } = await generateAccessToken('12345678901234567');

		const [header, payload, signature] = accessToken.split('.');

		const decodedPayload = JSON.parse(atob(payload || ''));

		// Set the expiration time to 1 hour ago
		decodedPayload.exp = Math.floor(Date.now() / 1000) - 3600;

		const expiredAccessToken = `${header}.${btoa(JSON.stringify(decodedPayload))}.${signature}`;

		const verifiedPayload = await verifyAccessToken(expiredAccessToken);
		expect(verifiedPayload).toBeNull();
	});
});
