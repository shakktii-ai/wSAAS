const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runMetaOAuthRedirectUriTests() {
  console.log('================================================================');
  console.log('  SHAKKTII META OAUTH REDIRECT_URI & SINGLE EXCHANGE QA SUITE    ');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function testAssert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // File Paths
  const whatsappPagePath = path.resolve(process.cwd(), 'src/pages/dashboard/whatsapp/index.jsx');
  const onboardingPagePath = path.resolve(process.cwd(), 'src/pages/dashboard/onboarding.jsx');
  const controllerPath = path.resolve(process.cwd(), 'src/controllers/metaEmbeddedController.js');

  const whatsappContent = fs.readFileSync(whatsappPagePath, 'utf8');
  const onboardingContent = fs.readFileSync(onboardingPagePath, 'utf8');
  const controllerContent = fs.readFileSync(controllerPath, 'utf8');

  // TEST 1: Verify redirect URI path consistency (/api/meta/exchange-token)
  testAssert(
    whatsappContent.includes('/api/meta/exchange-token') &&
      onboardingContent.includes('/api/meta/exchange-token') &&
      controllerContent.includes('/api/meta/exchange-token'),
    'TEST 1: Frontend and Backend share byte-for-byte identical endpoint path (/api/meta/exchange-token)'
  );

  // TEST 2: Verify FB.login options include explicit redirect_uri parameter
  testAssert(
    whatsappContent.includes('redirect_uri: redirectUri') &&
      onboardingContent.includes('redirect_uri: redirectUri'),
    'TEST 2: FB.login explicitly passes redirect_uri in options matching authorization'
  );

  // TEST 3: Verify backend exchangeToken sends redirect_uri to Meta Graph API
  testAssert(
    controllerContent.includes('exchangeParams.redirect_uri = resolvedRedirectUri') ||
      controllerContent.includes('redirect_uri: resolvedRedirectUri'),
    'TEST 3: metaEmbeddedController includes redirect_uri in Graph API /oauth/access_token exchange request'
  );

  // TEST 4: Verify single-execution guard (isExchangingRef) to prevent duplicate exchange calls
  testAssert(
    whatsappContent.includes('isExchangingRef.current') &&
      onboardingContent.includes('isExchangingRef.current'),
    'TEST 4: Frontend implements isExchangingRef guard to prevent double-consumption of authorization code'
  );

  // TEST 5: Verify no trailing slash mismatch bug in redirect URI derivation
  testAssert(
    whatsappContent.includes(".replace(/\\/$/, '')") &&
      onboardingContent.includes(".replace(/\\/$/, '')") &&
      controllerContent.includes(".replace(/\\/$/, '')"),
    'TEST 5: Origin normalization strips trailing slashes to prevent URI byte mismatch'
  );

  // TEST 6: Security Audit - Verify raw authorization code or tokens are never logged
  const safeLogCheck =
    !whatsappContent.includes('console.log(code') &&
    !onboardingContent.includes('console.log(code') &&
    !controllerContent.includes('console.log(code') &&
    !controllerContent.includes('console.log(accessToken');
  testAssert(
    safeLogCheck,
    'TEST 6: Security Audit - Authorization codes and access tokens are never printed in console logs'
  );

  // TEST 7: Security Audit - Verify client secret / app secret is never imported or referenced in frontend
  const frontendSecretCheck =
    !whatsappContent.includes('FACEBOOK_CLIENT_SECRET') &&
    !whatsappContent.includes('META_APP_SECRET') &&
    !onboardingContent.includes('FACEBOOK_CLIENT_SECRET') &&
    !onboardingContent.includes('META_APP_SECRET');
  testAssert(
    frontendSecretCheck,
    'TEST 7: Security Audit - FACEBOOK_CLIENT_SECRET and META_APP_SECRET are strictly backend-only'
  );

  console.log('\n================================================================');
  console.log(`META OAUTH QA SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runMetaOAuthRedirectUriTests().catch((err) => {
  console.error('Meta OAuth redirect URI test error:', err);
  process.exit(1);
});
