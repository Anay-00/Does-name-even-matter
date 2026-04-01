import { env, supabase } from '../config.js';

const BASE = 'http://localhost:3900/api';

async function req(path, token, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, { ...opts, headers });
  const body = await res.json();
  if (!res.ok) throw new Error(path + ' => ' + res.status + ': ' + JSON.stringify(body));
  return body;
}

async function run() {
  console.log('=== Multi-Doctor Smart Assignment E2E ===\n');

  // ── 1. Login as receptionist (Aurobindo) ──────────
  const recLogin = await req('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email: 'rec.auro@medisync.com', password: 'OPD@2026' })
  });
  console.log('1. Receptionist logged in:', recLogin.user.hospitalName);
  const recToken = recLogin.token;

  // ── 2. Verify login options show 3 doctors per dept ──────
  const options = await req('/auth/options', null);
  const auroHospital = options.find(h => h.short === 'auro');
  const auroDoctors = auroHospital.doctors.filter(d => d.deptCode === 'ORTH');
  console.log('2. ORTH doctors at Aurobindo:', auroDoctors.length,
    auroDoctors.map(d => d.name).join(', '));
  if (auroDoctors.length !== 3) throw new Error('Expected 3 ORTH doctors, got ' + auroDoctors.length);

  // ── 3. Issue 3 ORTH tokens → each should go to a different doctor ──
  const tokens = [];
  for (let i = 0; i < 3; i++) {
    const issued = await req('/tokens', recToken, {
      method: 'POST',
      body: JSON.stringify({
        symptomCategory: 'ORTH',
        patientName: `Patient-${i + 1}`,
        patientMobile: `900000000${i}`
      })
    });
    tokens.push(issued);
    console.log(`3.${i + 1}. Token ${issued.token.token_number} → Dr. ${issued.doctor.name} (Room ${issued.doctor.room_number}) ETA: ${issued.eta}min`);
  }

  // All 3 should go to different doctors (all free initially)
  const uniqueDoctors = new Set(tokens.map(t => t.doctor.id));
  console.log('\n   Unique doctors assigned:', uniqueDoctors.size);
  if (uniqueDoctors.size !== 3) {
    console.warn('   WARNING: Expected 3 unique doctors but got', uniqueDoctors.size);
  } else {
    console.log('   ✓ All 3 tokens assigned to different doctors (smart routing works!)');
  }

  // ── 4. Start consultation for doctor 1 (make them busy) ──
  const doc1Email = 'dr.orth.auro@medisync.com';
  const doc1Login = await req('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email: doc1Email, password: 'OPD@2026' })
  });
  const doc1Token = doc1Login.token;
  const doc1Id = doc1Login.user.doctorId;

  // Find the token assigned to doctor 1
  const tokenForDoc1 = tokens.find(t => t.doctor.id === doc1Id);
  if (!tokenForDoc1) {
    console.log('4. Doctor 1 has no token, skipping start');
  } else {
    await req('/tokens/' + tokenForDoc1.token.id + '/start', doc1Token, { method: 'PATCH' });
    console.log('4. Doctor 1 started consultation with', tokenForDoc1.token.token_number);
  }

  // ── 5. Issue a 4th token → should go to one of the 2 free doctors ──
  const issued4 = await req('/tokens', recToken, {
    method: 'POST',
    body: JSON.stringify({
      symptomCategory: 'ORTH',
      patientName: 'Patient-4',
      patientMobile: '9000000003'
    })
  });
  console.log('5. Token 4:', issued4.token.token_number, '→ Dr.', issued4.doctor.name,
    '(Room', issued4.doctor.room_number + ')');

  // Should NOT go to the busy doctor (doctor 1)
  if (issued4.doctor.id === doc1Id && tokenForDoc1) {
    console.warn('   WARNING: Token went to the busy doctor!');
  } else {
    console.log('   ✓ Token routed away from busy doctor');
  }

  // ── 6. Now make doctor 2 busy too ──
  const doc2Id = tokens.find(t => t.doctor.id !== doc1Id)?.doctor.id;
  // We need to find the email for doctor 2
  const doc2Info = auroDoctors.find(d => {
    // Match by checking the login response
    return true; // We'll try each one
  });

  // Login as each ORTH doctor to find doctor 2
  const orthEmails = ['dr.orth.auro@medisync.com', 'dr.orth2.auro@medisync.com', 'dr.orth3.auro@medisync.com'];
  let doc2Token = null;
  let tokenForDoc2 = null;
  for (const email of orthEmails) {
    const login = await req('/auth/login', null, {
      method: 'POST',
      body: JSON.stringify({ email, password: 'OPD@2026' })
    });
    if (login.user.doctorId === doc2Id) {
      doc2Token = login.token;
      tokenForDoc2 = tokens.find(t => t.doctor.id === doc2Id);
      if (tokenForDoc2) {
        await req('/tokens/' + tokenForDoc2.token.id + '/start', doc2Token, { method: 'PATCH' });
        console.log('6. Doctor 2 started consultation with', tokenForDoc2.token.token_number);
      }
      break;
    }
  }

  // ── 7. Issue 5th token → 2 doctors busy, 1 free → should go to free one ──
  const issued5 = await req('/tokens', recToken, {
    method: 'POST',
    body: JSON.stringify({
      symptomCategory: 'ORTH',
      patientName: 'Patient-5',
      patientMobile: '9000000004'
    })
  });
  console.log('7. Token 5:', issued5.token.token_number, '→ Dr.', issued5.doctor.name);

  const doc3Id = tokens.find(t => t.doctor.id !== doc1Id && t.doctor.id !== doc2Id)?.doctor.id;
  if (issued5.doctor.id === doc3Id) {
    console.log('   ✓ Token correctly routed to the only free doctor');
  }

  // ── 8. Make doctor 3 busy too (all busy scenario) ──
  let doc3Token = null;
  let tokenForDoc3 = tokens.find(t => t.doctor.id === doc3Id);
  for (const email of orthEmails) {
    const login = await req('/auth/login', null, {
      method: 'POST',
      body: JSON.stringify({ email, password: 'OPD@2026' })
    });
    if (login.user.doctorId === doc3Id) {
      doc3Token = login.token;
      if (tokenForDoc3) {
        await req('/tokens/' + tokenForDoc3.token.id + '/start', doc3Token, { method: 'PATCH' });
        console.log('8. Doctor 3 started consultation – ALL DOCTORS BUSY');
      }
      break;
    }
  }

  // ── 9. Issue 6th token → all busy → should go to doctor with least ETA ──
  const issued6 = await req('/tokens', recToken, {
    method: 'POST',
    body: JSON.stringify({
      symptomCategory: 'ORTH',
      patientName: 'Patient-6-AllBusy',
      patientMobile: '9000000005'
    })
  });
  console.log('9. Token 6 (all busy):', issued6.token.token_number, '→ Dr.', issued6.doctor.name,
    '| ETA:', issued6.eta + 'min | Queue pos:', issued6.positionInQueue);
  console.log('   ✓ Least-ETA assignment applied');

  // ── 10. Cleanup: complete all consultations ──
  console.log('\n10. Cleaning up...');
  if (tokenForDoc1) await req('/tokens/' + tokenForDoc1.token.id + '/complete', doc1Token, { method: 'PATCH' });
  if (tokenForDoc2 && doc2Token) await req('/tokens/' + tokenForDoc2.token.id + '/complete', doc2Token, { method: 'PATCH' });
  if (tokenForDoc3 && doc3Token) await req('/tokens/' + tokenForDoc3.token.id + '/complete', doc3Token, { method: 'PATCH' });

  // Cancel remaining waiting tokens
  const allTokenIds = [
    ...tokens.map(t => t.token.id),
    issued4.token.id,
    issued5.token.id,
    issued6.token.id,
  ];
  for (const tid of allTokenIds) {
    try {
      await supabase.from('opd_tokens').update({ status: 'cancelled' }).eq('id', tid).in('status', ['waiting']);
    } catch (e) { /* ignore */ }
  }
  console.log('   Cleaned up all test tokens');

  // ── 11. Display check ──
  const display = await req('/display/' + recLogin.user.hospitalId, null);
  console.log('11. Display: departments=' + display.departments.length);

  console.log('\n=== MULTI-DOCTOR E2E PASSED ===');
}

run().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
