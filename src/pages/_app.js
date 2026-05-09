import "@/styles/globals.css";
import QoriNode from "@/components/qori/QoriNode";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <QoriNode />
    </>
  );
}
