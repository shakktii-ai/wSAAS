const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local if dotenv is not installed
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
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const META_WABA_ID = process.env.META_WABA_ID;
const FACEBOOK_APP_ID = process.env.FACEBOOK_CLIENT_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

console.log('====================================================');
console.log('   TESTING META WHATSAPP API CREDENTIALS');
console.log('====================================================');
console.log(`App ID:           ${FACEBOOK_APP_ID}`);
console.log(`Phone Number ID:  ${META_PHONE_NUMBER_ID}`);
console.log(`WABA ID:          ${META_WABA_ID}`);
console.log(`Access Token:     ${META_ACCESS_TOKEN ? META_ACCESS_TOKEN.substring(0, 25) + '...' : 'MISSING'}`);
console.log('----------------------------------------------------');

async function testMetaCredentials() {
  let passed = 0;
  let failed = 0;

  // Test 1: Fetch WABA Details
  try {
    console.log('\n[1] Testing WABA Account Access...');
    const wabaRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/${META_WABA_ID}`, {
      headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` },
    });
    console.log('✅ WABA details fetched successfully:');
    console.log('   ID:', wabaRes.data.id);
    console.log('   Name:', wabaRes.data.name || '(No name set / default)');
    console.log('   Timezone:', wabaRes.data.timezone_id || 'N/A');
    passed++;
  } catch (err) {
    console.error('❌ WABA fetch failed:', err.response?.data?.error || err.message);
    failed++;
  }

  // Test 2: Fetch Phone Number Details
  try {
    console.log('\n[2] Testing Phone Number ID Access...');
    const phoneRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/${META_PHONE_NUMBER_ID}`, {
      headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` },
    });
    console.log('✅ Phone Number details fetched successfully:');
    console.log('   ID:', phoneRes.data.id);
    console.log('   Display Phone Number:', phoneRes.data.display_phone_number || 'N/A');
    console.log('   Verified Name:', phoneRes.data.verified_name || 'N/A');
    console.log('   Quality Rating:', phoneRes.data.quality_rating || 'N/A');
    passed++;
  } catch (err) {
    console.error('❌ Phone Number fetch failed:', err.response?.data?.error || err.message);
    failed++;
  }

  // Test 3: Fetch Message Templates
  try {
    console.log('\n[3] Testing WABA Message Templates Access...');
    const templatesRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/${META_WABA_ID}/message_templates?limit=5`, {
      headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` },
    });
    const templates = templatesRes.data?.data || [];
    console.log(`✅ Message Templates fetched successfully (${templates.length} templates returned):`);
    templates.forEach((t, i) => {
      console.log(`   ${i + 1}. [${t.status}] ${t.name} (${t.category}, ${t.language})`);
    });
    passed++;
  } catch (err) {
    console.error('❌ Templates fetch failed:', err.response?.data?.error || err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
}

testMetaCredentials();
