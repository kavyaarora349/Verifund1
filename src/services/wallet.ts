let peraWalletInstance: {
  connect?: () => Promise<string[]>;
  reconnectSession?: () => Promise<string[]>;
  disconnect?: () => Promise<void>;
  disconnectSession?: () => Promise<void>;
  connector?: { killSession?: () => Promise<void> };
} | null = null;

const ALGORAND_ADDRESS_REGEX = /^[A-Z2-7]{58}$/;

function isValidAlgorandAddress(address: string): boolean {
  return ALGORAND_ADDRESS_REGEX.test(address.trim());
}

async function getPeraWallet() {
  if (!peraWalletInstance) {
    const { PeraWalletConnect } = await import("@perawallet/connect");
    peraWalletInstance = new PeraWalletConnect();
  }
  return peraWalletInstance;
}

export async function connectPeraWallet(): Promise<string | null> {
  const peraWallet = await getPeraWallet();

  const existing = await peraWallet.reconnectSession?.();
  if (existing?.[0]) {
    return existing[0];
  }

  const accounts = await peraWallet.connect?.();
  return accounts?.[0] ?? null;
}

export async function disconnectPeraWallet(): Promise<void> {
  const peraWallet = await getPeraWallet();

  try {
    if (typeof peraWallet.disconnectSession === "function") {
      await peraWallet.disconnectSession();
    } else if (typeof peraWallet.disconnect === "function") {
      await peraWallet.disconnect();
    } else if (typeof peraWallet.connector?.killSession === "function") {
      await peraWallet.connector.killSession();
    }
  } catch {
    // Ignore wallet SDK disconnect errors on local cleanup.
  }
}

export async function getPeraWalletBalance(address: string): Promise<number | null> {
  if (!isValidAlgorandAddress(address)) {
    return null;
  }

  const endpoints = [
    `https://mainnet-api.algonode.cloud/v2/accounts/${address}`,
    `https://testnet-api.algonode.cloud/v2/accounts/${address}`
  ];

  let bestBalance: number | null = null;

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const payload = (await res.json()) as { amount?: number };
      if (typeof payload.amount === "number") {
        const algo = payload.amount / 1_000_000; // microAlgos -> ALGO
        if (bestBalance === null || algo > bestBalance) {
          bestBalance = algo;
        }
      }
    } catch {
      // Try next network endpoint.
    }
  }

  return bestBalance;
}
