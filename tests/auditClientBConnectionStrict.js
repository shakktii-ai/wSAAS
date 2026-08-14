const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        if (key && values.length > 0) {
          process.env[key.trim()] = values.join('=').trim();
        }
      }
    });
  }
}

loadEnv();

const META_API_VERSION = process.env.META_API_VERSION || 'v20.0';
const CLIENT_WABA_ID = '27142090378802643';
const CLIENT_PHONE_NUMBER_ID = '1279365541920553';
const SHAKKTII_APP_ID = '2805534946480538';

function maskToken(tok) {
  if (!tok) return 'NONE';
  return tok.slice(0, 6) + '...' + tok.slice(-6);
}

async function auditClientBStrict() {
  console.log('================================================================');
  console.log(`  STRICT CLIENT B (WABA ${CLIENT_WABA_ID}) META ACCESS AUDIT     `);
  console.log('================================================================');

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const companyB = await db.collection('companies').findOne({ wabaId: CLIENT_WABA_ID });
  if (!companyB) {
    console.error('❌ Company B document not found in MongoDB!');
    process.exit(1);
  }

  // 1. Determine Token Source
  let tokenSource = 'NONE';
  let tokenValue = '';

  if (companyB.accessToken) {
    tokenSource = 'company.accessToken';
    tokenValue = companyB.accessToken;
  } else if (companyB.whatsappConfig?.accessToken) {
    tokenSource = 'company.whatsappConfig.accessToken';
    tokenValue = companyB.whatsappConfig.accessToken;
  } else if (process.env.META_ACCESS_TOKEN) {
    tokenSource = 'environment (process.env.META_ACCESS_TOKEN)';
    tokenValue = process.env.META_ACCESS_TOKEN;
  }

  const isUsingOwnerEnvironmentToken = Boolean(tokenValue && tokenValue === process.env.META_ACCESS_TOKEN);

  console.log(`Company B ID: ${companyB._id}`);
  console.log(`Company B Name: ${companyB.name}`);
  console.log(`Token Source: ${tokenSource}`);
  console.log(`Token Masked: ${maskToken(tokenValue)}`);
  console.log(`Is Client B using Owner Environment Token? ${isUsingOwnerEnvironmentToken ? 'YES (Cross-tenant credential flaw)' : 'NO'}`);

  // 2. Test GET /{WABA_ID} using Client B's assigned token
  console.log(`\n[STEP 2] Testing GET /${CLIENT_WABA_ID} with assigned token...`);
  let wabaAccessPass = false;
  let wabaStatus = null;
  let wabaErrCode = null;
  let wabaErrSubcode = null;
  let wabaErrMsg = null;

  try {
    const resWaba = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/${CLIENT_WABA_ID}`, {
      headers: { Authorization: `Bearer ${tokenValue}` },
    });
    wabaAccessPass = true;
    wabaStatus = resWaba.status;
    console.log('✅ GET WABA Success (200 OK):', resWaba.data);
  } catch (err) {
    wabaStatus = err.response?.status || 500;
    wabaErrCode = err.response?.data?.error?.code;
    wabaErrSubcode = err.response?.data?.error?.error_subcode;
    wabaErrMsg = err.response?.data?.error?.message || err.message;
    console.error(`❌ GET WABA Failed (HTTP ${wabaStatus} | Code: ${wabaErrCode} | Subcode: ${wabaErrSubcode}):`, wabaErrMsg);
  }

  // 3. Test GET /{WABA_ID}/phone_numbers
  console.log(`\n[STEP 3] Testing GET /${CLIENT_WABA_ID}/phone_numbers with assigned token...`);
  let phoneAccessPass = false;
  try {
    const resPhone = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/${CLIENT_WABA_ID}/phone_numbers`, {
      headers: { Authorization: `Bearer ${tokenValue}` },
    });
    phoneAccessPass = true;
    console.log('✅ GET Phone Numbers Success (200 OK):', resPhone.data);
  } catch (err) {
    console.error(`❌ GET Phone Numbers Failed (HTTP ${err.response?.status || 500}):`, err.response?.data?.error?.message || err.message);
  }

  // 4. Test POST & GET /{WABA_ID}/subscribed_apps
  console.log(`\n[STEP 4] Testing WABA Subscribed Apps with assigned token...`);
  let wabaSubscribedPass = false;
  try {
    const resSubPost = await axios.post(
      `https://graph.facebook.com/${META_API_VERSION}/${CLIENT_WABA_ID}/subscribed_apps`,
      {},
      { headers: { Authorization: `Bearer ${tokenValue}` } }
    );
    console.log('✅ POST Subscribed Apps Success:', resSubPost.data);
    wabaSubscribedPass = true;
  } catch (err) {
    console.error(`❌ POST Subscribed Apps Failed (HTTP ${err.response?.status || 500}):`, err.response?.data?.error?.message || err.message);
  }

  await mongoose.disconnect();

  console.log('\n================================================================');
  console.log('                CLIENT B STRICT DIAGNOSTIC RESULTS               ');
  console.log('================================================================');
  console.log(`1. Client B Token Source:          ${tokenSource}`);
  console.log(`2. Client B WABA API Access:       ${wabaAccessPass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`3. Client B Phone API Access:      ${phoneAccessPass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`4. Client B WABA Subscription:     ${wabaSubscribedPass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log('================================================================');
}

auditClientBStrict();
