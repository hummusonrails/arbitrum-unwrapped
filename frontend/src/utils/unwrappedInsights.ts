export type Insights = {
  totalTransactions: number;
  totalVolumeEth: number;
  biggestDay: { label: string; txs: number; minutes: number };
  nftsMinted: number;
  topCollection: string;
  bridgeCount: number;
  gmStreak: number;
  firstTouch: string;
  mintStory: string;
  ethJourney: {
    start: number;
    end: number;
    peak: number;
    changePercent: number;
    biggestSwing: number;
  };
  nftSnapshot: {
    collectionsHeld: number;
    eventCity: string;
    oldestEventYear: string | number;
    eventBadgeCount: number;
  };
  streaks: {
    longestConsecutiveDays: number;
    dominantHourBucket: string;
  };
  dappDiversity: {
    uniqueDapps: number;
    topCategory: string;
  };
};

/**
 * Fetch real onchain insights for a wallet.
 * Expects an API that aggregates Arbitrum One 2025 data and returns the shape above.
 * Configure VITE_METRICS_API_URL to point to that service.
 */
export async function fetchInsights(address: string): Promise<Insights> {
  if (!address) {
    throw new Error("Wallet address required for insights.");
  }
  const base = import.meta.env.VITE_METRICS_API_URL;
  if (!base) {
    throw new Error("VITE_METRICS_API_URL is not set.");
  }

  const url = `${base}?address=${encodeURIComponent(address)}&year=2025`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load onchain insights (${res.status})`);
  }
  const data = await res.json();

  const requiredFields = [
    "totalTransactions",
    "totalVolumeEth",
    "biggestDay",
    "nftsMinted",
    "topCollection",
    "bridgeCount",
    "gmStreak",
    "firstTouch",
    "ethJourney",
    "nftSnapshot",
    "streaks",
    "dappDiversity",
  ];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      throw new Error(`Insights missing field: ${field}`);
    }
  }

  const biggestDay =
    typeof data.biggestDay === "object" && data.biggestDay !== null
      ? {
          label: String(data.biggestDay.label),
          txs: Number(data.biggestDay.txs),
          minutes: Number(data.biggestDay.minutes),
        }
      : { label: "Biggest day unavailable", txs: 0, minutes: 0 };

  const mintStory =
    data.mintStory ||
    [
      "Arbitrum Unwrapped 2025",
      `${data.totalTransactions} txs`,
      `${data.totalVolumeEth} ETH moved`,
      `Biggest day: ${biggestDay.label}`,
    ].join(" · ");

  return {
    totalTransactions: Number(data.totalTransactions),
    totalVolumeEth: Number(data.totalVolumeEth),
    biggestDay,
    nftsMinted: Number(data.nftsMinted),
    topCollection: String(data.topCollection),
    bridgeCount: Number(data.bridgeCount),
    gmStreak: Number(data.gmStreak),
    firstTouch: String(data.firstTouch),
    mintStory: String(mintStory),
    ethJourney: data.ethJourney,
    nftSnapshot: data.nftSnapshot,
    streaks: data.streaks,
    dappDiversity: data.dappDiversity,
  };
}
