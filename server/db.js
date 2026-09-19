import pg from 'pg';

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Dates,
// so entry dates never shift with the server's timezone.
pg.types.setTypeParser(1082, (value) => value);

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
