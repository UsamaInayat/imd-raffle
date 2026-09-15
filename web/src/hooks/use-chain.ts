"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  createWalletClient,
  custom,
  type Abi,
  type Address,
  type Hash,
} from "viem";
import { mainnet } from "viem/chains";
import {
  ERC721_ABI,
  IDENTITY_MD_ADDRESS,
  RAFFLE_CONTRACT_ADDRESS,
} from "@/lib/constants";
import { publicClient } from "@/lib/viem-client";

const IS_ADMIN_ABI = [
  {
    type: "function",
    name: "isAdmin",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
] as const;

const OWNER_ABI = [
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
] as const;

function serializeArgs(args?: readonly unknown[]): string {
  if (!args) return "";
  return args
    .map((value) => (typeof value === "bigint" ? `b:${value}` : String(value)))
    .join(",");
}

export function useWalletAddress(): Address | undefined {
  const { wallets } = useWallets();
  const address = wallets[0]?.address;

  return useMemo(
    () => (address ? (address.toLowerCase() as Address) : undefined),
    [address]
  );
}

export function useContractRead<T>({
  abi,
  functionName,
  args,
  enabled = true,
  refetchInterval,
  contractAddress = RAFFLE_CONTRACT_ADDRESS,
}: {
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  enabled?: boolean;
  refetchInterval?: number;
  contractAddress?: Address;
}) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | undefined>();
  const argsKey = serializeArgs(args);
  const queryKey = `${contractAddress}:${functionName}:${argsKey}:${enabled}`;
  const argsRef = useRef(args);
  const abiRef = useRef(abi);

  argsRef.current = args;
  abiRef.current = abi;

  const fetchData = useCallback(async () => {
    if (
      !enabled ||
      !contractAddress ||
      contractAddress.endsWith("0000")
    ) {
      return;
    }

    try {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: abiRef.current,
        functionName,
        args: argsRef.current,
      });
      setData(result as T);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "read failed");
    }
  }, [contractAddress, enabled, functionName]);

  useEffect(() => {
    setData(undefined);
    setError(undefined);
  }, [queryKey]);

  useEffect(() => {
    if (
      !enabled ||
      !contractAddress ||
      contractAddress.endsWith("0000")
    ) {
      return;
    }

    void fetchData();

    if (!refetchInterval) return;
    const timer = setInterval(() => void fetchData(), refetchInterval);
    return () => clearInterval(timer);
  }, [queryKey, refetchInterval, fetchData, enabled, contractAddress]);

  const isLoading =
    enabled &&
    !contractAddress.endsWith("0000") &&
    data === undefined &&
    error === undefined;

  return { data, isLoading, error, refetch: fetchData };
}

export function useContractWrite() {
  const { wallets } = useWallets();
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState<Hash | undefined>();
  const [error, setError] = useState<string | undefined>();

  const write = useCallback(
    async ({
      abi,
      functionName,
      args = [],
    }: {
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
    }) => {
      const wallet = wallets[0];
      if (!wallet) {
        setError("connect wallet first");
        return;
      }

      setIsPending(true);
      setError(undefined);
      setTxHash(undefined);

      try {
        const provider = await wallet.getEthereumProvider();
        const walletClient = createWalletClient({
          account: wallet.address as Address,
          chain: mainnet,
          transport: custom(provider),
        });

        const hash = await walletClient.writeContract({
          address: RAFFLE_CONTRACT_ADDRESS,
          abi,
          functionName,
          args,
          chain: mainnet,
        });

        setTxHash(hash);
        await publicClient.waitForTransactionReceipt({ hash });
      } catch (err) {
        setError(err instanceof Error ? err.message : "transaction failed");
      } finally {
        setIsPending(false);
      }
    },
    [wallets]
  );

  return { write, isPending, txHash, error };
}

export function useIsHolder() {
  const address = useWalletAddress();
  const { authenticated, ready } = usePrivy();

  const enabled = Boolean(ready && authenticated && address);

  const { data: balance, isLoading, refetch } = useContractRead<bigint>({
    abi: ERC721_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    enabled,
    contractAddress: IDENTITY_MD_ADDRESS,
  });

  return {
    isHolder: balance !== undefined && balance > BigInt(0),
    isLoading: enabled && isLoading,
    balance,
    refetch,
  };
}

export function useIsAdmin() {
  const address = useWalletAddress();
  const { authenticated, ready } = usePrivy();

  const enabled = Boolean(ready && authenticated && address);

  const { data: isAdmin, isLoading, refetch } = useContractRead<boolean>({
    abi: IS_ADMIN_ABI,
    functionName: "isAdmin",
    args: address ? [address] : undefined,
    enabled,
  });

  return {
    isAdmin: Boolean(isAdmin),
    isLoading: enabled && isLoading,
    refetch,
  };
}

export function useIsOwner() {
  const address = useWalletAddress();
  const { authenticated, ready } = usePrivy();

  const enabled = Boolean(ready && authenticated && address);

  const { data: owner, isLoading } = useContractRead<Address>({
    abi: OWNER_ABI,
    functionName: "owner",
    enabled,
  });

  return {
    isOwner: Boolean(owner && address && owner.toLowerCase() === address.toLowerCase()),
    owner,
    isLoading: enabled && isLoading,
  };
}
