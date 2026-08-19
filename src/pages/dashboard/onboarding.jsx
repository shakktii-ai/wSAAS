import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import api from '@/services/api';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Globe,
  ArrowRight,
  ExternalLink,
  Info,
} from 'lucide-react';

export default function SaaSOnboardingWizard() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchOnboardingData = async () => {
    try {
      setLoading(true);
      const statusRes = await api.get('/onboarding/status');
      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data);
      }
    } catch (err) {
      console.error('Failed to load onboarding status:', err);
    } finally {
      setLoading(false);
    }
  };

  const embeddedSessionRef = React.useRef({ wabaId: null, phoneNumberId: null });
  const oauthCodeRef = React.useRef(null);
  const isExchangingRef = React.useRef(false);
  const embeddedTimeoutRef = React.useRef(null);

  const tryCompleteMetaExchange = () => {
    const code = oauthCodeRef.current;
    const { wabaId, phoneNumberId } = embeddedSessionRef.current;

    console.log('[META_EXCHANGE_GATE]', {
      hasCode: Boolean(code),
      hasWabaId: Boolean(wabaId),
      hasPhoneNumberId: Boolean(phoneNumberId),
      exchangeStarted: isExchangingRef.current,
    });

    if (code && wabaId && !isExchangingRef.current) {
      if (embeddedTimeoutRef.current) {
        clearTimeout(embeddedTimeoutRef.current);
        embeddedTimeoutRef.current = null;
      }
      isExchangingRef.current = true;
      completeExchange({
        code,
        wabaId,
        phoneNumberId: phoneNumberId || null,
      });
    }
  };

  useEffect(() => {
    fetchOnboardingData();

    // Load Meta Facebook SDK dynamically
    if (typeof window !== 'undefined' && !window.FB) {
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
          cookie: true,
          xfbml: true,
          version: 'v20.0',
        });
      };
      (function (d, s, id) {
        var js,
          fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s);
        js.id = id;
        js.src = 'https://connect.facebook.net/en_US/sdk.js';
        fjs.parentNode.insertBefore(js, fjs);
      })(document, 'script', 'facebook-jssdk');
    }

    // Listen to Meta Embedded Signup session events from popup window
    const handleMetaMessage = (event) => {
      const allowedOrigins = [
        'https://www.facebook.com',
        'https://web.facebook.com',
        'https://facebook.com',
      ];
      const isAllowedOrigin = allowedOrigins.includes(event.origin) || (event.origin && event.origin.endsWith('.facebook.com'));
      if (!isAllowedOrigin) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && typeof data === 'object' && data.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('[META_EMBEDDED_MESSAGE_RECEIVED]', {
            origin: event.origin,
            messageType: data.type,
            event: data.event || 'UNKNOWN',
            hasWabaId: Boolean(data.data?.waba_id),
            hasPhoneNumberId: Boolean(data.data?.phone_number_id),
            version: data.data?.version || 'UNKNOWN',
          });

          if (data.event === 'FINISH') {
            const { waba_id, phone_number_id } = data.data || {};
            embeddedSessionRef.current = { wabaId: waba_id, phoneNumberId: phone_number_id };
            console.log('[META_EMBEDDED_SIGNUP_FINISH]', {
              event: 'FINISH',
              hasWabaId: Boolean(waba_id),
              hasPhoneNumberId: Boolean(phone_number_id),
            });
            if (embeddedTimeoutRef.current) {
              clearTimeout(embeddedTimeoutRef.current);
              embeddedTimeoutRef.current = null;
            }
            tryCompleteMetaExchange();
          } else if (data.event === 'CANCEL') {
            console.log('[META_EMBEDDED_CANCEL]', {
              origin: event.origin,
              timestamp: new Date().toISOString(),
            });
            if (embeddedTimeoutRef.current) {
              clearTimeout(embeddedTimeoutRef.current);
              embeddedTimeoutRef.current = null;
            }
            setConnecting(false);
          } else if (data.event === 'ERROR') {
            console.warn('[META_EMBEDDED_ERROR]', {
              origin: event.origin,
              errorData: data.data || null,
              timestamp: new Date().toISOString(),
            });
            if (embeddedTimeoutRef.current) {
              clearTimeout(embeddedTimeoutRef.current);
              embeddedTimeoutRef.current = null;
            }
            setConnecting(false);
            setErrorMessage('Meta Embedded Signup encountered an error during configuration.');
          }
        }
      } catch (e) {
        // Non-JSON message ignore
      }
    };

    window.addEventListener('message', handleMetaMessage);
    return () => {
      window.removeEventListener('message', handleMetaMessage);
      if (embeddedTimeoutRef.current) {
        clearTimeout(embeddedTimeoutRef.current);
      }
    };
  }, []);

  const completeExchange = async (payload) => {
    try {
      setConnecting(true);
      // Frontend sends ONLY code, wabaId, phoneNumberId (Backend owns token-exchange redirect URI)
      const cleanPayload = {
        code: payload.code,
        wabaId: payload.wabaId,
        phoneNumberId: payload.phoneNumberId,
      };

      console.log('[META_OAUTH_FLOW]', {
        stage: 'EXCHANGE_STARTED',
        hasCode: Boolean(cleanPayload.code),
        hasWabaId: Boolean(cleanPayload.wabaId),
        hasPhoneNumberId: Boolean(cleanPayload.phoneNumberId),
      });

      const res = await api.post('/meta/exchange-token', cleanPayload);
      if (res.success) {
        fetchOnboardingData();
      } else {
        setErrorMessage(res.message || 'Meta OAuth authorization exchange failed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'WhatsApp connection was not completed. Please try connecting again.');
    } finally {
      setConnecting(false);
      isExchangingRef.current = false;
      if (embeddedTimeoutRef.current) {
        clearTimeout(embeddedTimeoutRef.current);
        embeddedTimeoutRef.current = null;
      }
    }
  };

  const handleLaunchMetaSignup = async () => {
    if (connecting || isExchangingRef.current) return;
    setConnecting(true);
    setErrorMessage('');
    isExchangingRef.current = false;
    oauthCodeRef.current = null;
    embeddedSessionRef.current = { wabaId: null, phoneNumberId: null };

    if (embeddedTimeoutRef.current) {
      clearTimeout(embeddedTimeoutRef.current);
    }
    // 120s Timeout Guard
    embeddedTimeoutRef.current = setTimeout(() => {
      if (!isExchangingRef.current) {
        console.warn('[META_EMBEDDED_TIMEOUT]', {
          hasCode: Boolean(oauthCodeRef.current),
          hasWabaId: Boolean(embeddedSessionRef.current?.wabaId),
          hasPhoneNumberId: Boolean(embeddedSessionRef.current?.phoneNumberId),
          timestamp: new Date().toISOString(),
        });
        setConnecting(false);
      }
    }, 120000);

    let appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
    let configId = process.env.NEXT_PUBLIC_META_CONFIG_ID || '';

    let startResData = null;
    try {
      const startRes = await api.post('/meta/embedded-signup/start');

      // TASK 5: Safe Frontend API Response Log
      console.log('[META_CONFIG_API_RESPONSE]', {
        responseType: typeof startRes,
        success: Boolean(startRes?.success),
        hasData: Boolean(startRes?.data),
        topLevelKeys: Object.keys(startRes || {}),
        dataKeys: startRes?.data ? Object.keys(startRes.data) : [],
        configIdTopLevelPresent: Boolean(startRes?.configId),
        configIdNestedPresent: Boolean(startRes?.data?.configId),
        configIdSnakeCaseTopLevelPresent: Boolean(startRes?.config_id),
        configIdSnakeCaseNestedPresent: Boolean(startRes?.data?.config_id),
      });

      // TASK 6: Universal Response Shape Extraction
      if (startRes) {
        startResData = startRes.data || startRes;
        if (startRes.appId) appId = startRes.appId;
        if (startRes.data?.appId) appId = startRes.data.appId;

        const responseConfigId =
          startRes.configId ||
          startRes.config_id ||
          startRes.data?.configId ||
          startRes.data?.config_id ||
          '';

        if (responseConfigId) {
          configId = responseConfigId;
        }
      }
    } catch (e) {
      console.warn('[Meta Onboarding] Start endpoint notice:', e.message);
    }

    console.log('[META_CONFIG_TRACE]', {
      source: configId ? 'API_OR_ENV' : 'MISSING',
      configIdPresent: Boolean(configId),
      configIdLength: configId ? configId.length : 0,
      appId: appId || '2805534946480538',
    });

    // TASK 8: Missing Config ID Guard
    if (!configId) {
      console.error('[META_CONFIG_MISSING]', {
        appId: appId || '2805534946480538',
        source: 'MISSING',
        timestamp: new Date().toISOString(),
      });
      setConnecting(false);
      if (embeddedTimeoutRef.current) {
        clearTimeout(embeddedTimeoutRef.current);
        embeddedTimeoutRef.current = null;
      }
      setErrorMessage('Meta Embedded Signup configuration ID is missing. Please ensure META_EMBEDDED_SIGNUP_CONFIG_ID or META_CONFIG_ID is set in Vercel environment.');
      return;
    }

    console.log('[META_OAUTH_FLOW]', {
      stage: 'LOGIN_STARTED',
      appId,
      configIdPresent: Boolean(configId),
      responseType: 'code',
      overrideDefaultResponseType: true,
      currentOrigin: typeof window !== 'undefined' ? window.location.origin : '',
      currentPath: typeof window !== 'undefined' ? window.location.pathname : '',
      timestamp: new Date().toISOString(),
    });

    const initAndLogin = () => {
      if (appId && window.FB) {
        try {
          window.FB.init({
            appId,
            cookie: true,
            xfbml: true,
            version: 'v20.0',
          });
        } catch (e) {}
      }

      const apiExtras = startResData?.extras || {};
      const sessionInfoVersion = apiExtras.sessionInfoVersion || '3';
      const featureType = apiExtras.featureType || 'whatsapp_business_app_onboarding';
      const version = apiExtras.version || 'v4';

      console.log('[META_SESSION_VERSION]', {
        sessionInfoVersion,
        featureType,
        version,
        configIdPresent: Boolean(configId),
        responseType: 'code',
      });

      // TASK 6: Log safe metadata before FB.login authorization request
      console.log('[META_OAUTH_AUTH_REQUEST]', {
        appId: appId || '2805534946480538',
        configId,
        responseType: 'code',
        overrideDefaultResponseType: true,
        esVersion: version,
        sessionInfoVersion,
        featureType: featureType,
        origin: typeof window !== 'undefined' ? window.location.origin : '',
        pathname: typeof window !== 'undefined' ? window.location.pathname : '',
      });

      const extrasObj = {
        setup: apiExtras.setup || {},
        sessionInfoVersion: sessionInfoVersion,
        version: version,
      };
      const resolvedFeatureType = apiExtras.featureType !== undefined ? apiExtras.featureType : featureType;
      if (resolvedFeatureType) {
        extrasObj.featureType = resolvedFeatureType;
      }

      const loginOptions = {
        scope: startResData?.scope || 'business_management,whatsapp_business_management,whatsapp_business_messaging',
        response_type: 'code',
        override_default_response_type: true,
        extras: extrasObj,
      };
      if (configId) {
        loginOptions.config_id = configId;
      }

      // TASK 6: Add safe actual OAuth context trace log before FB.login
      console.log('[META_ACTUAL_OAUTH_CONTEXT]', {
        hasFallbackRedirectUri: true,
        hasRedirectUri: true,
        origin: typeof window !== 'undefined' ? window.location.origin : '',
        pathname: typeof window !== 'undefined' ? window.location.pathname : '',
      });

      // TASK 3: Add safe client-side diagnostic for Meta popup onboarding stage
      console.log('[META_ONBOARDING_BLOCK]', {
        stage: 'EMBEDDED_SIGNUP_LAUNCHED',
        configId,
        featureType: loginOptions.extras?.featureType || 'NONE',
        esVersion: loginOptions.extras?.version || 'v4',
        sessionInfoVersion: loginOptions.extras?.sessionInfoVersion || '3',
      });

      window.FB.login(
        (response) => {
          const code = response?.authResponse?.code;
          const accessToken = response?.authResponse?.accessToken;

          console.log('[META_OAUTH_CALLBACK]', {
            hasCode: Boolean(code),
            hasAccessToken: Boolean(accessToken),
            authStatus: response?.status,
          });

          console.log('[META_OAUTH_FLOW]', {
            stage: 'FB_LOGIN_CALLBACK',
            hasCode: Boolean(code),
            hasAccessToken: Boolean(accessToken),
            authStatus: response?.status,
          });

          if (code) {
            oauthCodeRef.current = code;
            tryCompleteMetaExchange();
          } else {
            // Task 9: If hasCode: false & hasAccessToken: true after CANCEL, do NOT exchange. Reset UI loading state if session finished without code.
            if (!embeddedSessionRef.current.wabaId) {
              setConnecting(false);
            }
          }
        },
        loginOptions
      );
    };

    if (typeof window !== 'undefined' && window.FB) {
      initAndLogin();
    } else {
      (function (d, s, id) {
        var js,
          fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s);
        js.id = id;
        js.src = 'https://connect.facebook.net/en_US/sdk.js';
        js.onload = () => {
          if (window.FB) initAndLogin();
          else setErrorMessage('Meta Facebook SDK could not be initialized.');
        };
        js.onerror = () => {
          setErrorMessage('Failed to load Facebook SDK. Please check your network connection.');
          setConnecting(false);
        };
        fjs.parentNode.insertBefore(js, fjs);
      })(document, 'script', 'facebook-jssdk');
    }
  };

  const isConnected = status?.isConnected;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-600" /> WhatsApp Onboarding Setup
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Connect your official WhatsApp Business Account to start sending and receiving messages in Shakktii Inbox.
          </p>
        </div>

        {/* Free SaaS Disclaimer Banner */}
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-slate-900 text-sm font-bold mb-0.5">Shakktii SaaS is Free to Use</strong>
            <span className="text-slate-700">
              Shakktii is free to use. WhatsApp/Meta messaging charges, if applicable, are billed directly by Meta to your Meta Business Account.
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessage}
          </div>
        )}

        {/* Main Step Cards */}
        <div className="space-y-4">
          {/* Step 1: Create Account & Workspace */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-200">
                  ✓
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">1. Create Shakktii Account & Workspace</h3>
                  <p className="text-xs text-slate-500">Account created and workspace initialized.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
                Completed
              </span>
            </div>
          </Card>

          {/* Step 2: Connect WhatsApp via Meta */}
          <Card className={isConnected ? 'border-emerald-200 bg-white shadow-xs' : 'border-blue-200 bg-white shadow-xs'}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    isConnected ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {isConnected ? '✓' : '2'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">2. Connect WhatsApp Business Account</h3>
                    <p className="text-xs text-slate-500">Authorize Shakktii via official Meta Embedded Signup.</p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                  isConnected ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  {isConnected ? 'Connected' : 'Action Required'}
                </span>
              </div>

              {!isConnected ? (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <p className="text-xs text-slate-600">
                    Click the button below to launch Meta Embedded Signup. You will log in with Facebook, select your WhatsApp Business Account, select your phone number, and authorize Shakktii.
                  </p>
                  <Button
                    variant="primary"
                    onClick={handleLaunchMetaSignup}
                    disabled={connecting}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <Smartphone className="w-4 h-4" />
                    {connecting ? 'Connecting with Meta...' : 'Connect WhatsApp with Meta'}
                  </Button>
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> WhatsApp Business Account connected
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Phone number connected ({status?.displayPhoneNumber || 'Connected'})
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Webhook connected & verified
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Messaging ready
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Step 3: Go to Dashboard Inbox */}
          <Card className={isConnected ? 'border-emerald-200 bg-emerald-50/50 shadow-xs' : 'border-slate-200 bg-white opacity-70'}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">3. Access Shakktii Inbox</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Start sending broadcasts, automated replies, and managing live customer conversations.
                </p>
              </div>

              <Button
                variant={isConnected ? 'primary' : 'secondary'}
                disabled={!isConnected}
                onClick={() => router.push('/dashboard/inbox')}
                className="w-full md:w-auto flex items-center justify-center gap-2"
              >
                Go to Inbox <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
