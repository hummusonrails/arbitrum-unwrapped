import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEventLogs } from "viem";

import ArbitrumUnwrappedAbi from "./abi/ArbitrumUnwrapped.json";
import { type Insights, fetchInsights } from "./utils/unwrappedInsights";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const MINT_PRICE_WEI = 15000000000000n; // ~0.000015 ETH (~$0.05)

export default function App() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, error: connectError, status: connectStatus } = useConnect();
  const { writeContractAsync, isPending: isWritePending, error: writeError } = useWriteContract();

  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { data: receipt, isLoading: isConfirming, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [mintPhase, setMintPhase] = useState<"idle" | "wallet" | "confirming" | "success">("idle");
  const [mintedStory, setMintedStory] = useState<string | null>(null);
  const [pendingStory, setPendingStory] = useState<string | null>(null);
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [shareMode, setShareMode] = useState<"mint" | "story">("mint");

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  const loadInsights = async (targetAddress?: string) => {
    if (!targetAddress) return;
    setIsLoadingInsights(true);
    setInsightsError(null);
    try {
      const data = await fetchInsights(targetAddress);
      setInsights(data);
    } catch (err) {
      setInsights(null);
      setInsightsError((err as Error).message);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      loadInsights(address);
    } else {
      setInsights(null);
    }
  }, [isConnected, address]);

  const connectWallet = () => {
    const preferred = connectors.find((connector) => connector.ready) ?? connectors[0];
    if (preferred) {
      connect({ connector: preferred });
    }
  };

  const generate = () => {
    setMintError(null);
    setMintedTokenId(null);
    setMintedStory(null);
    setPendingStory(null);
    setMintPhase("idle");
    if (address) {
      loadInsights(address);
    }
  };

  const handleMint = async () => {
    if (!insights) {
      generate();
      return;
    }
    if (!isConnected) {
      connectWallet();
      return;
    }
    setMintError(null);
    setPendingStory(insights.mintStory);
    setMintPhase("wallet");
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: ArbitrumUnwrappedAbi,
        functionName: "mint",
        args: [insights.mintStory],
        value: MINT_PRICE_WEI,
      });
      setTxHash(hash);
      setMintPhase("confirming");
    } catch (err) {
      setMintPhase("idle");
      setPendingStory(null);
      setMintError((err as Error).message);
    }
  };

  useEffect(() => {
    if (!isMintSuccess || !receipt) return;
    let tokenId: string | null = null;
    try {
      const events = parseEventLogs({
        abi: ArbitrumUnwrappedAbi,
        eventName: "StoryMinted",
        logs: receipt.logs ?? [],
      });
      const last = events.at(-1);
      if (last?.args?.tokenId) {
        tokenId = (last.args.tokenId as bigint).toString();
      }
    } catch (err) {
      console.warn("Failed to parse mint logs", err);
    }
    setMintPhase("success");
    setMintedStory(pendingStory ?? insights?.mintStory ?? null);
    setMintedTokenId(tokenId);
  }, [isMintSuccess, receipt, pendingStory, insights]);

  const shareToFarcaster = () => {
    const appUrl = "https://farcaster.xyz/miniapps/8idfqZvCXlsG/arbitrum-unwrapped";
    const defaultMintText = mintedStory
      ? `Minted my Arbitrum Unwrapped 2025 story. ✨\n\n${mintedStory}\n\n${appUrl}`
      : `Arbitrum Unwrapped 2025 is live. Generate your year onchain + mint it.\n\n${appUrl}`;

    const storyText =
      insights && shareMode === "story"
        ? [
            "Arbitrum Unwrapped 2025 highlights:",
            `${insights.totalTransactions} txs · ${insights.totalVolumeEth.toFixed(2)} ETH moved`,
            `Biggest day: ${insights.biggestDay.label} (${insights.biggestDay.txs} txs)`,
            `${insights.nftsMinted} NFTs minted · Bridges: ${insights.bridgeCount} · Streak: ${insights.gmStreak} days`,
            `First touch: ${insights.firstTouch}`,
          ].join("\n")
        : defaultMintText;

    const text = `${shareMode === "story" ? storyText : defaultMintText}\n\n${appUrl}`;

    sdk.actions.composeCast({
      text,
      embeds: [],
    });
  };

  const truncatedAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  const isMinting = isWritePending || isConfirming;

  const statusLabel = (() => {
    if (mintError) return `Error: ${mintError}`;
    if (mintPhase === "wallet" || isWritePending) return "Waiting for wallet confirmation...";
    if (isConfirming) return "Sealing your Unwrapped onchain...";
    if (mintPhase === "success" && mintedTokenId) return `Mint confirmed · Token #${mintedTokenId}`;
    if (mintPhase === "success") return "Mint confirmed on Arbitrum.";
    return null;
  })();

  const txUrl =
    receipt && receipt.transactionHash
      ? `https://arbiscan.io/tx/${receipt.transactionHash}`
      : undefined;

  const storySlides = (() => {
    const base: {
      id: string;
      eyebrow: string;
      title: string;
      body: string;
      cta?: "connect" | "mint";
      image?: string;
    }[] = [
      {
        id: "intro",
        eyebrow: "Arbitrum Unwrapped 2025",
        title: "Your year on Arbitrum, in motion.",
        body: isLoadingInsights
          ? "Pulling your Arbitrum One 2025 footprint..."
          : "Tap to begin and flip through your onchain story. Connect to load your personal stats.",
        cta: isConnected ? undefined : "connect",
        image: "/unwrapped.png",
      },
    ];

    if (insights) {
      base.push(
        {
          id: "flow",
          eyebrow: "Arbitrum Flow",
          title: `${insights.totalVolumeEth.toFixed(2)} ETH moved`,
          body: `${insights.totalTransactions} transactions across Arbitrum One in 2025.`,
          image: "/eth_moved.png",
        },
        {
          id: "biggest",
          eyebrow: "Biggest Day",
          title: insights.biggestDay.label,
          body: `${insights.biggestDay.txs} txs · ${insights.biggestDay.minutes} minutes onchain.`,
          image: "/biggest_day.png",
        },
        {
          id: "collector",
          eyebrow: "Collector Energy",
          title: `${insights.nftsMinted} NFTs minted`,
          body: `Top collection: ${insights.topCollection}`,
          image: "/nfts_minted.png",
        },
        {
          id: "bridge",
          eyebrow: "Bridge & Streak",
          title: `${insights.bridgeCount} bridges · ${insights.gmStreak}-day streak`,
          body: `First Arbitrum touch: ${insights.firstTouch}`,
          image: "/bridges.png",
        },
        {
          id: "eth-journey",
          eyebrow: "ETH Journey",
          title: `Peak: ${insights.ethJourney.peak} ETH`,
          body: `Started ${insights.ethJourney.start} → Ended ${insights.ethJourney.end} (${insights.ethJourney.changePercent}% change) · Biggest swing ${insights.ethJourney.biggestSwing} ETH`,
          image: "/eth_peak.png",
        },
        {
          id: "nft-holdings",
          eyebrow: "NFT Shelf",
          title: `${insights.nftSnapshot.collectionsHeld} collections held`,
          body: `Oldest badge year: ${insights.nftSnapshot.oldestEventYear} · Event city: ${insights.nftSnapshot.eventCity} · Event/POAPs: ${insights.nftSnapshot.eventBadgeCount}`,
          image: "/nft_shelf.png",
        },
        {
          id: "streaks",
          eyebrow: "Rhythm",
          title: `Longest streak: ${insights.streaks.longestConsecutiveDays} days`,
          body: `Most active hours: ${insights.streaks.dominantHourBucket} UTC`,
          image: "/longest_streak.png",
        },
        {
          id: "diversity",
          eyebrow: "Dapp Explorer",
          title: `${insights.dappDiversity.uniqueDapps} apps touched`,
          body: `Top category: ${insights.dappDiversity.topCategory}`,
          image: "/apps_touched.png",
        },
      );
    }

    base.push({
      id: "mint",
      eyebrow: "Mint Your Story",
      title: mintedStory ? "Minted onchain." : "Seal it as an NFT.",
      body: mintedStory || "Lock your 2025 Arbitrum story onchain and share it.",
      cta: "mint",
    });

    return base;
  })();

  const goNext = () => setCurrentSlide((i) => Math.min(i + 1, storySlides.length - 1));
  const goPrev = () => setCurrentSlide((i) => Math.max(i - 1, 0));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050914] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(20,178,255,0.18),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,71,190,0.12),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(74,222,255,0.14),transparent_30%)]" />
      <main className="relative z-10 mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 lg:px-8">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-200">Arbitrum Unwrapped</p>
              <h1 className="text-4xl font-black leading-tight sm:text-5xl md:text-6xl">Storybook</h1>
            </div>
            {address && (
              <div className="hidden rounded-full border border-cyan-300/40 bg-white/5 px-4 py-2 text-xs font-semibold text-cyan-100 shadow-lg sm:inline-flex">
                {truncatedAddress}
              </div>
            )}
          </div>
          <p className="max-w-2xl text-lg text-slate-200">
            Swipe through your 2025 Arbitrum One highlights,
            unwrap your Arbitrum story from this past year.
          </p>
        </header>

        {insightsError && (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {insightsError}
          </div>
        )}

        <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-r from-[#0b1020] via-[#0f1227] to-[#0b0f1d] p-8 shadow-[0_26px_110px_rgba(0,0,0,0.55)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(52,211,235,0.18),transparent_35%),radial-gradient(circle_at_85%_30%,rgba(255,71,190,0.16),transparent_35%),radial-gradient(circle_at_70%_80%,rgba(74,222,255,0.15),transparent_38%)]" />
          <div className="relative flex flex-col gap-6">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-cyan-100">
              <span>{storySlides[currentSlide]?.eyebrow}</span>
              <span>
                {String(currentSlide + 1).padStart(2, "0")} / {String(storySlides.length).padStart(2, "0")}
              </span>
            </div>
            <div className="min-h-[220px] space-y-3">
              {storySlides[currentSlide]?.image && (
                <div className="relative w-full overflow-hidden rounded-3xl border border-white/5 bg-white/5">
                  <img
                    src={storySlides[currentSlide]?.image}
                    alt={`${storySlides[currentSlide]?.eyebrow} artwork`}
                    className="h-full w-full object-cover opacity-90"
                  />
                </div>
              )}
              <h2 className="text-4xl font-black leading-tight sm:text-5xl">{storySlides[currentSlide]?.title}</h2>
              <p className="max-w-2xl text-slate-200">{storySlides[currentSlide]?.body}</p>
              {isLoadingInsights && (
                <div className="mt-2 text-sm text-cyan-200">Loading real onchain activity from Arbitrum One...</div>
              )}
              {mintedStory && storySlides[currentSlide]?.id === "mint" && (
                <div className="mt-3 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  <div className="text-xs uppercase tracking-[0.25em] text-emerald-200">Minted story</div>
                  <div className="mt-1 text-base font-semibold text-white">{mintedStory}</div>
                  <div className="mt-1 text-xs text-emerald-200">
                    {mintedTokenId ? `Token #${mintedTokenId}` : "Awaiting token id from receipt"}
                  </div>
                </div>
              )}
              {statusLabel && storySlides[currentSlide]?.id === "mint" && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-cyan-100">
                  {statusLabel}
                </div>
              )}
              {(writeError || connectError) && storySlides[currentSlide]?.id === "mint" && (
                <div className="mt-3 rounded-2xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {(writeError || connectError)?.message}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {storySlides[currentSlide]?.cta === "connect" && !isConnected && (
                <button
                  className="rounded-full bg-gradient-to-r from-[#34d8ff] via-[#3b82f6] to-[#a855f7] px-5 py-3 text-sm font-semibold text-white shadow-[0_15px_60px_rgba(0,0,0,0.35)] transition hover:translate-y-[-1px] hover:shadow-[0_18px_70px_rgba(0,0,0,0.45)] disabled:opacity-60"
                  onClick={connectWallet}
                  disabled={connectStatus === "pending"}
                >
                  Connect wallet
                </button>
              )}
              {storySlides[currentSlide]?.id === "mint" && (
                <>
                  <button
                    className="rounded-full bg-gradient-to-r from-[#34d8ff] via-[#3b82f6] to-[#a855f7] px-5 py-3 text-sm font-semibold text-white shadow-[0_15px_70px_rgba(0,0,0,0.45)] transition hover:translate-y-[-2px] hover:shadow-[0_18px_90px_rgba(0,0,0,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleMint}
                    disabled={isMinting || !insights || isLoadingInsights}
                  >
                    {isConnected
                      ? isLoadingInsights
                        ? "Loading onchain insights..."
                        : insights
                          ? "Mint my Arbitrum Unwrapped"
                          : "Generate and mint"
                      : "Connect to mint"}
                  </button>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-200">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-cyan-200">Share style</span>
                    <div className="flex gap-2">
                      <button
                        className={`rounded-full border px-3 py-1 transition ${
                          shareMode === "mint"
                            ? "border-white bg-white/10 text-white"
                            : "border-white/20 bg-white/5 text-slate-200"
                        }`}
                        onClick={() => setShareMode("mint")}
                        disabled={!mintedStory}
                      >
                        Mint text
                      </button>
                      <button
                        className={`rounded-full border px-3 py-1 transition ${
                          shareMode === "story"
                            ? "border-white bg-white/10 text-white"
                            : "border-white/20 bg-white/5 text-slate-200"
                        }`}
                        onClick={() => setShareMode("story")}
                        disabled={!insights}
                      >
                        Story stats
                      </button>
                    </div>
                  </div>
                  <button
                    className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={shareToFarcaster}
                    disabled={!mintedStory}
                  >
                    Share to Farcaster
                  </button>
                  {txUrl && (
                    <a
                      href={txUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs text-emerald-200 underline-offset-4 hover:underline"
                    >
                      View on explorer
                    </a>
                  )}
                </>
              )}
              {storySlides[currentSlide]?.cta !== "mint" && (
                <button
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                  onClick={generate}
                  disabled={isLoadingInsights}
                >
                  {isLoadingInsights ? "Refreshing insights..." : "Refresh my data"}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {storySlides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      idx === currentSlide ? "bg-white" : "bg-white/30"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10 disabled:opacity-40"
                  onClick={goPrev}
                  disabled={currentSlide === 0}
                >
                  Prev
                </button>
                <button
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10 disabled:opacity-40"
                  onClick={goNext}
                  disabled={currentSlide === storySlides.length - 1}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
