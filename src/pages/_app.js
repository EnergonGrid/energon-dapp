import "@/styles/globals.css";
import { useRouter } from "next/router";
import QoriNode from "@/components/qori/QoriNode";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  return (
    <>
      <Component {...pageProps} />
      {router.isReady && <QoriNode key={router.query.mode === "landing" ? "landing" : "guardian"} landingMode={router.query.mode === "landing"} />}
    </>
  );
}
