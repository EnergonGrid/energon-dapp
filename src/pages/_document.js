import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.ico?v=3" sizes="any" />

        <link
          rel="icon"
          type="image/svg+xml"
          href="/favicon.svg?v=3"
        />

        <link
          rel="icon"
          type="image/png"
          sizes="96x96"
          href="/favicon-96x96.png?v=3"
        />

        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon.png?v=3"
        />

        <link
          rel="manifest"
          href="/site.webmanifest?v=3"
        />

        <meta name="theme-color" content="#05060b" />
        <meta name="application-name" content="Energon" />
        <meta
          name="apple-mobile-web-app-title"
          content="Energon"
        />
      </Head>

      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}