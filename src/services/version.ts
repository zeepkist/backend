import { lt } from 'semver';
import { db, version } from '../db';

export async function isModOutdated(modVersion: string) {
	try {
		const entry = await db.select().from(version).limit(1);

		if (entry.length === 0 || !entry[0]?.minimum) {
			console.error('No version entry found in the database');
			return false;
		}

		const minimumVersion = entry[0].minimum;

		console.debug(`Comparing mod version ${modVersion} with minimum version ${minimumVersion}`);

		// Check if the mod version is less than the minimum semver version (e.g "1.2.3 < "1.2.4")
		return lt(modVersion, minimumVersion, {});
	} catch (error) {
		// if not type error, log the error
		if (!(error instanceof TypeError)) {
			console.error('Error checking mod version:', error);
		}

		return true;
	}
}
