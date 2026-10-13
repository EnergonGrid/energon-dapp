import "@/styles/globals.css";

import { WagmiProvider } from "wagmi";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { wagmiConfig } from "@/lib/wagmi";
import QoriNode from "@/components/qori/QoriNode";
import { EmpStateProvider } from "@/lib/emp/EmpStateProvider";

const queryClient = new QueryClient();

export default function App({ Component, pageProps }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <EmpStateProvider>
          <Component {...pageProps} />
          <QoriNode />
        </EmpStateProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
