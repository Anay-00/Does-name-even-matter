/**
 * Test + run migration: check if UNIQUE constraint exists, drop it via workaround if needed.
 * Usage: node apps/opd/server/scripts/test-constraint.mjs
 */
import { supabase } from "../config.js";

// Get any existing department
const { data: dept } = await supabase.from("opd_departments").select("id, code, hospital_id").limit(1).single();
console.log("Test dept:", dept?.code, dept?.id);

// Try inserting a second doctor for the same department
const { data: doc, error } = await supabase
  .from("opd_doctors")
  .insert({
    hospital_id: dept.hospital_id,
    department_id: dept.id,
    name: "Dr. Test Duplicate",
    qualification: "Test",
    room_number: "999",
  })
  .select("id, name")
  .single();

if (error) {
  console.log("Insert error:", error.message);
  const isUniqueViolation = error.message.includes("unique") || error.message.includes("duplicate");
  if (isUniqueViolation) {
    console.log("=> UNIQUE constraint exists - need DDL migration via Supabase Dashboard SQL Editor.");
    console.log("   Run this SQL in the Supabase Dashboard SQL Editor:");
    console.log("   ALTER TABLE public.opd_doctors DROP CONSTRAINT IF EXISTS opd_doctors_department_id_key;");
  } else {
    console.log("=> Different error - may still work");
  }
} else {
  console.log("=> Insert succeeded! UNIQUE constraint already removed (or never existed).");
  // Clean up test row
  await supabase.from("opd_doctors").delete().eq("id", doc.id);
  console.log("=> Cleanup done. Multi-doctor is ready.");
}
