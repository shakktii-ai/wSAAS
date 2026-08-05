import '@/styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <title>SyncChat | Enterprise WhatsApp Cloud Platform</title>
        <meta name="description" content="SyncChat Enterprise WhatsApp Communication & Automation SaaS Platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
} { }
