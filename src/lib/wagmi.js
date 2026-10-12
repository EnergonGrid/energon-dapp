import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";
import { getAddresses } from "./addresses";

const cfg = getAddresses();

export const flareMainnet = defineChain({
  id: 14,
  name: "Flare Mainnet",
  network: "flare",
  nativeCurrency: {
    name: "Flare",
    symbol: "FLR",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [cfg.rpcUrl],
    },
    public: {
      http: [cfg.rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "Flarescan",
      url: "https://flarescan.com",
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [flareMainnet],
  connectors: [injected()],
  transports: {
    [flareMainnet.id]: http(cfg.rpcUrl),
  },
  ssr: true,
});
