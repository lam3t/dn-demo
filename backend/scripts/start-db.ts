import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';

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
  console.log('Embedded PostgreSQL started successfully!');

  // Create database tn_edu_db if it does not exist
  try {
    await pg.createDatabase('tn_edu_db');
    console.log('Database tn_edu_db created/verified!');
  } catch (err: any) {
    console.log('Database already exists or ready:', err.message);
  }
}

main().catch((err) => {
  console.error('Failed to start Embedded PostgreSQL:', err);
});
