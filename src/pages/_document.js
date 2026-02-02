import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Primary favicon */}
        <link rel="icon" href="/favicon.ico" />

        {/* PNG fallbacks */}
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />

        {/* Apple / iOS */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* Android / PWA */}
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