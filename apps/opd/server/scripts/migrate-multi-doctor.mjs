/**
 * Run migration to allow multiple doctors per department.
 * Usage: node apps/opd/server/scripts/migrate-multi-doctor.mjs
 */
import pg from "pg";
const { Client } = pg;

const c = new Client({
  host: "db.nzyuaftfkfgkbsvffbhk.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56eXVhZnRma2Zna2JzdmZmYmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU1NjEwMiwiZXhwIjoyMDg5MTMyMTAyfQ.99GwYexfSEYSLcTtROW_gJ45yy3LGFPgyW8XuexpZCg",
  ssl: { rejectUnauthorized: false },
});

try {
  await c.connect();
  console.log("Connected to DB");

  await c.query(`
    ALTER TABLE public.opd_doctors DROP CONSTRAINT IF EXISTS opd_doctors_department_id_key;
  `);
  console.log("Dropped UNIQUE(department_id) constraint");

  await c.query(`
    CREATE INDEX IF NOT EXISTS idx_opd_doctors_department
      ON public.opd_doctors(department_id, is_active);
  `);
  console.log("Created index idx_opd_doctors_department");

  console.log("\nMigration complete - multiple doctors per department now allowed");
} catch (err) {
  console.error("Migration failed:", err.message);
} finally {
  await c.end();
}
