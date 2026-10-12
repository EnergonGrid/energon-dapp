import "@/styles/globals.css";

import { WagmiProvider } from "wagmi";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { wagmiConfig } from "@/lib/wagmi";
import QoriNode from "@/components/qori/QoriNode";

const queryClient = new QueryClient();

export default function App({ Component, pageProps }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
        <QoriNode />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
