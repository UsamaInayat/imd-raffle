"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mainnet } from "viem/chains";
import { PRIVY_APP_ID } from "@/lib/constants";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID || "clxxxxxxxxxxxxxxxxxxxxxxxxx"}
      config={{
        loginMethods: ["wallet"],
        appearance: {
          theme: "light",
          accentColor: "#000000",
          showWalletLoginFirst: true,
        },
        embeddedWallets: {
          createOnLogin: "off",
        },
        defaultChain: mainnet,
        supportedChains: [mainnet],
      }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PrivyProvider>
  );
}
