import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@privy-io/react-auth", "@privy-io/wagmi"],
  outputFileTracingRoot: path.join(__dirname, "../"),
};

export default nextConfig;
