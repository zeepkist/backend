# GTR Backend V2 (NodeJS Rewrite)

This is a re-implementation of the C# GTR Backend in NodeJS (using Bun)

## Requirements

- Routing: `fastify`
- Authentication: `fastify-oauth2`
- Background Jobs: `BullMQ` with `Redis` (`DiceDB` instead of `Redis` as a lighter alternative? Consider setting a maxmemory policy on the Redis container (e.g., `maxmemory 256mb` with `maxmemory-policy allkeys-lru`))
- Job Scheduling: `Graphile Worker` (replacing `Hangfire` tasks)
- Database: `postgreSQL`
- Database ORM: `drizzle-orm` (`drizzle-orm @neondatabase/serverless pg`, look into `drizzle-kit`)

## TODO

- [x] Database Models
- [ ] Steam Authentication (1:1 re-implementation of C# behaviour) / JWT
- [ ] Mod/Game version verification for Auth requests
- [ ] Figure out what `SequenceComparer` and `Vector3Comparer` are for
- [ ] Migrate Hangfire background jobs / scheduled jobs to Graphile Worker or BullMQ
	- [ ] Backend Service
		- [ ] Calculate Level Points (Daily)
		- [ ] Calculate User Points (Hourly)
	- [ ] Workshop Service
		- [ ] Process Level Requests (5 minutes)
		- [ ] Full Workshop Scan (Monthly)
		- [ ] Partial Workshop Scan (Hourly)
- [ ] Utilities
	- [ ] Zeepkist Level parsing
	- [ ] Level Hashing util
- [ ] OpenTelemetry Logging
- [ ] Upload ghost data to Wasabi S3
- [ ] Update Personal Bests
- [ ] Update World Records
