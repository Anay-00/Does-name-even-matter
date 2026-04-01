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
  console.log('=== E2E Flow Test ===\n');

  // 1. Login as receptionist
  const recLogin = await req('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email: 'rec.auro@medisync.com', password: 'OPD@2026' })
  });
  console.log('1. Receptionist login:', recLogin.user.role, recLogin.user.hospitalName);
  const recToken = recLogin.token;

  // 2. Issue a token (Orthopedics patient)
  const issued = await req('/tokens', recToken, {
    method: 'POST',
    body: JSON.stringify({
      symptomCategory: 'ORTH',
      patientName: 'Rahul Test',
      patientMobile: '9999999999'
    })
  });
  console.log('2. Token issued:', issued.token.token_number, '|', issued.department, '|', issued.doctor, '| Room:', issued.room);
  const tokenId = issued.token.id;

  // 3. Login as doctor (Orthopedics, Aurobindo)
  const docLogin = await req('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email: 'dr.orth.auro@medisync.com', password: 'OPD@2026' })
  });
  console.log('3. Doctor login:', docLogin.user.doctorName, '|', docLogin.user.departmentName);
  const docToken = docLogin.token;

  // 4. Get doctor panel
  const panel1 = await req('/doctor/panel', docToken);
  const currentToken1 = panel1.currentPatient ? panel1.currentPatient.token_number : 'none';
  console.log('4. Doctor panel: waiting=' + panel1.waitingQueue.length, 'current=' + currentToken1);

  // 5. Start consultation (Patient Entered)
  const started = await req('/tokens/' + tokenId + '/start', docToken, { method: 'PATCH' });
  console.log('5. Patient Entered:', started.token_number, '-> status:', started.status);

  // 6. Get doctor panel again (should show current patient)
  const panel2 = await req('/doctor/panel', docToken);
  const currentToken2 = panel2.currentPatient ? panel2.currentPatient.token_number : 'none';
  console.log('6. After start: current=' + currentToken2, 'waiting=' + panel2.waitingQueue.length);

  // 7. Complete consultation
  const completeResult = await req('/tokens/' + tokenId + '/complete', docToken, { method: 'PATCH' });
  console.log('7. Consultation Complete:', completeResult.completed.token_number, '-> status:', completeResult.completed.status, '| duration:', completeResult.completed.consultation_duration_seconds + 's');

  // 8. Final doctor panel
  const panel3 = await req('/doctor/panel', docToken);
  console.log('8. Final panel: waiting=' + panel3.waitingQueue.length, 'completed=' + panel3.completedCount, 'avgMin=' + panel3.avgConsultationMinutes);

  // 9. Check display endpoint
  const display = await req('/display/' + recLogin.user.hospitalId, null);
  console.log('9. Display: departments=' + display.departments.length, 'totalToday=' + display.totalToday, 'completed=' + display.completedToday);

  console.log('\n=== ALL TESTS PASSED ===');
}

run().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
