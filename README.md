# Backend

The **Backend** is the central service for the [Zeepkist Community Hub], powering [ZeepCentral] and the
[GTR mod] for [Zeepkist]. It handles recording runs, saving ghosts, posting times, and providing
data to both internal services and the community.

## Features

- REST API for internal services (GTR mod, ZeepCentral)
- Secure authentication for web and mod clients
- Fast, reliable storage of player records and ghosts
- Database schema management and migrations with [drizzle](drizzle/)
- Automated and scheduled jobs for leaderboard updates, history tracking, and data maintenance
- Importing Zeepkist Super League results

## Requirements

- [Bun](https://bun.sh/)
- PostgreSQL database
- Node.js (for some tooling)
- Docker (optional, for containerized deployment)

## Getting Started

1. **Clone the repository:**
    ```sh
    git clone https://github.com/ZeepkistCommunityHub/backend.git
    cd backend
    ```

2. **Install dependencies:**
    ```sh
    bun install
    ```

3. **Configure environment:**
    - Copy `.env.example` to `.env` and fill in the required values.

4. **Run database migrations:**
    ```sh
    bun run db:migrate
    ```

5. **Start the server:**
    ```sh
    bun run start
    ```

### Local Database Exploration

A built-in database visualiser is available to assist with local development and inspection of your
data models. To launch the visualiser, run:

```sh
bun run db:studio
```

### Managing Database Migrations

After modifying the database schema in `drizzle/schema.ts`, generate a new migration with:

```sh
bun run db:generate
```

Apply the generated migration to your local database using:

```sh
bun run db:migrate
```

If you have made manual changes to the database (for example, via `db:studio` or direct PostgreSQL
access), and need to synchronize the schema file with your current database state, you can update
`drizzle/schema.ts` by running:

```sh
bun run db:pull
```

> [!NOTE]
> Using `db:pull` is generally discouraged unless necessary, as it may overwrite intentional
> schema changes.

## Structure

The repository is organised to promote clarity, maintainability, and scalability. Below is an
overview of the main directories and their purposes:

```sh
./
├── drizzle/
│   ├── *.sql       # Database migration files, used to evolve and manage the schema over time
│   └── schema.ts   # Central TypeScript schema definitions for the database
└── src/
    ├── cache       # In-memory key-value cache utilities for temporary data storage
    ├── config      # Shared configuration files and environment management
    ├── db          # Database connection and low-level database utilities
    ├── discord     # Integrations and services related to Discord
    ├── hooks       # Fastify lifecycle hooks
    ├── jobs        # Automated and scheduled background jobs for maintenance and data processing
    ├── middleware  # Fastify middleware for request/response handling
    ├── otel        # OpenTelemetry tracing and observability setup
    ├── routes      # Fastify route definitions for API endpoints
    ├── s3          # Wasabi S3 storage integration and utilities
    ├── services    # Business logic and database access services
    ├── steam       # Integrations and services related to Steam
    ├── types       # Shared TypeScript type definitions
    ├── utils       # General-purpose utility functions
    ├── zsl         # Zeepkist Super League data and logic
    ├── index.ts    # Application entry point
    └── server.ts   # Fastify server setup and configuration
```

This modular structure ensures that each concern is separated, making the codebase easier to
navigate and extend.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

- Open issues for bugs or feature requests
- Submit pull requests for improvements or fixes

## Documentation

- **Private REST API:** Utilised by internal services and GTR (see `src/server.ts` and [backend.zeepki.st](https://backend.zeepki.st))
- **Public GraphQL API:** [graphql.zeepki.st](https://graphql.zeepki.st) (powered by [zeepkist/postgraphile](https://github.com/zeepkist/postgraphile))
- **Database schema:** Refer to the `drizzle/` directory for schema definitions and migration files.
- **Automated Jobs:** See [`src/jobs/`](src/jobs/) for background task definitions, scheduling and
    batch processing logic.

## SQL Commands

### Verify PersonalBestGlobal

Verify that the PersonalBestGlobal table has the fastest record of a user set as their PB on a level.

#### Dry Run

```sql
SELECT
    pbg.id AS personal_best_id,
    pbg.id_user,
    pbg.id_level,
    pbg.id_record AS current_record_id,
    cr.time AS current_record_time,
    cr.date_created AS current_record_created,
    r.id AS fastest_record_id,
    r.time AS fastest_time,
    r.date_created AS fastest_record_created
FROM personal_best_global pbg
JOIN record cr ON cr.id = pbg.id_record
JOIN (
    SELECT DISTINCT ON (id_user, id_level)
        id,
        id_user,
        id_level,
        time,
        date_created
    FROM record
    ORDER BY id_user, id_level, time ASC, date_created ASC, id ASC
) r ON r.id_user = pbg.id_user
   AND r.id_level = pbg.id_level
WHERE pbg.id_record <> r.id
ORDER BY pbg.id_user, pbg.id_level;
```

#### Execute

```sql
UPDATE personal_best_global pbg
SET id_record = r.id,
    date_updated = NOW()
FROM (
    -- Fastest record per user per level (ties go to oldest)
    SELECT DISTINCT ON (id_user, id_level)
        id,
        id_user,
        id_level,
        time
    FROM record
    ORDER BY id_user, id_level, time ASC, date_created ASC, id ASC
) r
WHERE pbg.id_user = r.id_user
  AND pbg.id_level = r.id_level
  AND pbg.id_record <> r.id;
```

### Verify WorldRecordGlobal

Verify that the WorldRecordGlobal table has the fastest record set on the level

#### Dry Run

```sql
SELECT
    wrg.id AS world_record_id,
    wrg.id_level,
    wrg.id_record AS current_record_id,
    cr.time AS current_record_time,
    cr.date_created AS current_record_created,
    r.id AS fastest_record_id,
    r.time AS fastest_time,
    r.date_created AS fastest_record_created,
    r.id_user AS fastest_record_user
FROM world_record_global wrg
JOIN record cr ON cr.id = wrg.id_record
JOIN (
    SELECT DISTINCT ON (id_level)
        id,
        id_user,
        id_level,
        time,
        date_created
    FROM record
    ORDER BY id_level, time ASC, date_created ASC, id ASC
) r ON r.id_level = wrg.id_level
WHERE wrg.id_record <> r.id
ORDER BY wrg.id_level;
```

#### Execute

```sql
UPDATE world_record_global wrg
SET id_record = r.id,
    id_user = r.id_user,
    date_updated = NOW()
FROM (
    -- Fastest record per level (ties go to oldest)
    SELECT DISTINCT ON (id_level)
        id,
        id_user,
        id_level,
        time
    FROM record
    ORDER BY id_level, time ASC, date_created ASC, id ASC
) r
WHERE wrg.id_level = r.id_level
  AND wrg.id_record <> r.id;
```

## License

This project is licensed under the [MIT License](LICENSE).

[Zeepkist Community Hub]: https://github.com/zeepkist
[ZeepCentral]: https://zeepki.st
[GTR mod]: https://mod.io/g/zeepkist/m/zeepkist-gtr
[Zeepkist]: https://store.steampowered.com/app/1440670/Zeepkist/
