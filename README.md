# GTR Backend V2 (NodeJS Rewrite)

This is a re-implementation of the C# GTR Backend in NodeJS (using Bun)

## TODO

- [ ] Document Schema
- [ ] Migrate `SequenceComparer` and `Vector3Comparer`
- [ ] Get total subcriptions, playsessions and playtime for workshop items
	- https://api.steampowered.com/IPublishedFileService/GetDetails/v1?key=XYZ&itemcount=1&publishedfileids[0]=3480533417
- [ ] Graphile Worker Scheduled Jobs
	- [ ] Workshop Service
		- [ ] Process Level Requests (5 minutes)
		- [ ] Full Workshop Scan (Monthly)
		- [ ] Partial Workshop Scan (Hourly)
	- [ ] Cleanup Service
		- [ ] Ensure player's best time is their PB (Monthly)
		- [ ] Ensure level's best time is the WR (Monthly)
- [ ] Utilities
	- [ ] Zeepkist Level parsing
	- [ ] Level Hashing util
- [ ] OpenTelemetry Logging
- [ ] Zeepkist Super League
	- [ ] Database models
	- [ ] Populate database
