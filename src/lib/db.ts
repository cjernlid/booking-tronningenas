import { neon } from '@neondatabase/serverless';

export function getDb() {
  const sql = neon(process.env.POSTGRES_URL!);
  return sql;
}
