import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Primary favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />

        {/* Modern favicon formats */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />

        {/* Apple / iOS */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* PWA / Manifest */}
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#05060b" />

        {/* App identity */}
        <meta name="application-name" content="Energon" />
        <meta name="apple-mobile-web-app-title" content="Energon" />
      </Head>

      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}