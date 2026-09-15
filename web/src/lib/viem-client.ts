import { createPublicClient, http, type Abi, type Address } from "viem";
import { mainnet } from "viem/chains";
import { RAFFLE_CONTRACT_ADDRESS } from "@/lib/constants";

const rpcUrl =
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL ?? "https://eth.llamarpc.com";

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(rpcUrl),
});

export async function readContract<T>({
  address = RAFFLE_CONTRACT_ADDRESS,
  abi,
  functionName,
  args = [],
}: {
  address?: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}): Promise<T> {
  return publicClient.readContract({
    address,
    abi,
    functionName,
    args,
  }) as Promise<T>;
}
