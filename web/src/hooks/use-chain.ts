"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

function serializeArgs(args?: readonly unknown[]): string {
  if (!args) return "";
  return args
    .map((value) => (typeof value === "bigint" ? `b:${value}` : String(value)))
    .join(",");
}

export function useWalletAddress(): Address | undefined {
  const { wallets } = useWallets();
  const wallet = wallets[0];
  return wallet?.address as Address | undefined;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const argsKey = serializeArgs(args);
  const argsRef = useRef(args);
  const abiRef = useRef(abi);
  const hasDataRef = useRef(false);

  argsRef.current = args;
  abiRef.current = abi;

  const refetch = useCallback(async () => {
    if (
      !enabled ||
      !contractAddress ||
      contractAddress.endsWith("0000")
    ) {
      setIsLoading(false);
      return;
    }
    if (!hasDataRef.current) {
      setIsLoading(true);
    }
    try {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: abiRef.current,
        functionName,
        args: argsRef.current,
      });
      setData(result as T);
      hasDataRef.current = true;
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "read failed");
      hasDataRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [functionName, argsKey, enabled, contractAddress]);

  useEffect(() => {
    hasDataRef.current = false;
    setData(undefined);
    setError(undefined);
    setIsLoading(true);
  }, [functionName, argsKey, contractAddress]);

  useEffect(() => {
    void refetch();
    if (!refetchInterval) return;
    const timer = setInterval(() => void refetch(), refetchInterval);
    return () => clearInterval(timer);
  }, [refetch, refetchInterval]);

  return { data, isLoading, error, refetch };
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
  const { authenticated } = usePrivy();

  const { data: balance, isLoading, refetch } = useContractRead<bigint>({
    abi: ERC721_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    enabled: Boolean(authenticated && address),
    contractAddress: IDENTITY_MD_ADDRESS,
  });

  return {
    isHolder: balance !== undefined && balance > BigInt(0),
    isLoading,
    balance,
    refetch,
  };
}

export function useIsAdmin() {
  const address = useWalletAddress();
  const { authenticated } = usePrivy();

  const { data: isAdmin, isLoading, refetch } = useContractRead<boolean>({
    abi: [
      {
        type: "function",
        name: "isAdmin",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ type: "bool" }],
        stateMutability: "view",
      },
    ],
    functionName: "isAdmin",
    args: address ? [address] : undefined,
    enabled: Boolean(authenticated && address),
  });

  return {
    isAdmin: Boolean(isAdmin),
    isLoading,
    refetch,
  };
}

export function useIsOwner() {
  const address = useWalletAddress();
  const { authenticated } = usePrivy();

  const { data: owner, isLoading } = useContractRead<Address>({
    abi: [
      {
        type: "function",
        name: "owner",
        inputs: [],
        outputs: [{ type: "address" }],
        stateMutability: "view",
      },
    ],
    functionName: "owner",
    enabled: Boolean(authenticated && address),
  });

  return {
    isOwner: Boolean(owner && address && owner.toLowerCase() === address.toLowerCase()),
    owner,
    isLoading,
  };
}
