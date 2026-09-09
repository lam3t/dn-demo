const EmbeddedPostgres = require('embedded-postgres').default;
const path = require('path');

async function main() {
  const dataDir = path.join(__dirname, '../.pg_data');
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port: 5432,
    user: 'postgres',
    password: 'postgrespassword',
    persistent: true,
  });

  console.log('Starting Embedded PostgreSQL on port 5432...');
  await pg.initialise();
  await pg.start();
  console.log('Embedded PostgreSQL started successfully on port 5432!');

  try {
    await pg.createDatabase('tn_edu_db');
    console.log('Database tn_edu_db is ready!');
  } catch (err) {
    console.log('Database note:', err.message);
  }

  // Keep alive
  console.log('PostgreSQL service is running...');
  setInterval(() => {}, 100000);
}

main().catch((err) => {
  console.error('Failed to start Embedded PostgreSQL:', err);
});
