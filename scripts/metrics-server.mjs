#!/usr/bin/env node
// Fetches 2025 Arbitrum One activity via Blockscout v2
// Run: `PORT=3001 node scripts/metrics-server.mjs`

import http from "node:http";
import { URL } from "node:url";

const PORT = process.env.PORT || 3001;
const BASE = "https://arbitrum.blockscout.com/api/v2";
const MAX_TX_PAGES = 10;
const MAX_TRANSFER_PAGES = 10;
const MAX_ERC20_PAGES = 8;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  if (url.pathname !== "/insights") {
    send(res, 404, { error: "Not found" });
    return;
  }

  const address = url.searchParams.get("address") || "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    send(res, 400, { error: "Invalid address" });
    return;
  }

  try {
    const [txs2025, transfers2025, erc20Transfers, ethHistory, nftCollections] = await Promise.all([
      fetchAddressTransactions(address),
      fetchAddressTokenTransfers(address),
      fetchAddressErc20Transfers(address),
      fetchAddressEthHistory(address),
      fetchAddressNftCollections(address),
    ]);
    const metrics = buildInsights(address, txs2025, transfers2025, erc20Transfers, ethHistory, nftCollections);
    send(res, 200, metrics);
  } catch (err) {
    console.error("Error building insights:", err);
    send(res, 500, { error: err.message || "Failed to fetch insights" });
  }
});

server.listen(PORT, () => {
  console.log(`Metrics server listening on http://localhost:${PORT}/insights?address=0x...`);
});

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(body));
}

// Fetch transactions using Blockscout v2:
// GET /addresses/{address_hash}/transactions with pagination via next_page_params.
// We page newest->oldest, stop after MAX_TX_PAGES or once timestamps fall before 2025.
async function fetchAddressTransactions(address) {
  const collected = [];
  let pageParams = {};
  for (let page = 0; page < MAX_TX_PAGES; page += 1) {
    const params = new URLSearchParams({
      ...pageParams,
    });
    const url = `${BASE}/addresses/${address}/transactions?${params.toString()}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Blockscout tx request failed (${resp.status}): ${text.slice(0, 200)}`);
    }
    const json = await resp.json();
    const items = json?.items || [];

    let hitPre2025 = false;
    for (const tx of items) {
      const ts = tx?.timestamp;
      if (!ts) continue;
      const year = new Date(ts).getUTCFullYear();
      if (year === 2025) {
        collected.push(tx);
      } else if (year < 2025) {
        hitPre2025 = true;
        break;
      }
    }

    const next = json?.next_page_params;
    if (!next || hitPre2025) break;
    pageParams = sanitizePageParams(next);
  }
  return collected;
}

// Fetch token transfers (ERC-721/1155) via Blockscout v2:
// GET /addresses/{address_hash}/token-transfers with type param.
// We page newest->oldest, stop after MAX_TRANSFER_PAGES or once timestamps fall before 2025.
async function fetchAddressTokenTransfers(address) {
  const collected = [];
  let pageParams = {};
  for (let page = 0; page < MAX_TRANSFER_PAGES; page += 1) {
    const params = new URLSearchParams({
      type: "ERC-721,ERC-1155",
      ...pageParams,
    });
    const url = `${BASE}/addresses/${address}/token-transfers?${params.toString()}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Blockscout transfer request failed (${resp.status}): ${text.slice(0, 200)}`);
    }
    const json = await resp.json();
    const items = json?.items || [];

    let hitPre2025 = false;
    for (const tr of items) {
      const ts = tr?.timestamp;
      if (!ts) continue;
      const year = new Date(ts).getUTCFullYear();
      if (year === 2025) {
        collected.push(tr);
      } else if (year < 2025) {
        hitPre2025 = true;
        break;
      }
    }

    const next = json?.next_page_params;
    if (!next || hitPre2025) break;
    pageParams = sanitizePageParams(next);
  }
  return collected;
}

// Fetch ERC-20 transfers for token habit stats.
async function fetchAddressErc20Transfers(address) {
  const collected = [];
  let pageParams = {};
  for (let page = 0; page < MAX_ERC20_PAGES; page += 1) {
    const params = new URLSearchParams({
      type: "ERC-20",
      ...pageParams,
    });
    const url = `${BASE}/addresses/${address}/token-transfers?${params.toString()}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Blockscout ERC20 transfer request failed (${resp.status}): ${text.slice(0, 200)}`);
    }
    const json = await resp.json();
    const items = json?.items || [];

    let hitPre2025 = false;
    for (const tr of items) {
      const ts = tr?.timestamp;
      if (!ts) continue;
      const year = new Date(ts).getUTCFullYear();
      if (year === 2025) {
        collected.push(tr);
      } else if (year < 2025) {
        hitPre2025 = true;
        break;
      }
    }

    const next = json?.next_page_params;
    if (!next || hitPre2025) break;
    pageParams = sanitizePageParams(next);
  }
  return collected;
}

// ETH balance history by day for 2025.
async function fetchAddressEthHistory(address) {
  const url = `${BASE}/addresses/${address}/coin-balance-history-by-day`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Blockscout ETH history request failed (${resp.status}): ${text.slice(0, 200)}`);
  }
  const json = await resp.json();
  return json?.items || [];
}

// NFT collections snapshot.
async function fetchAddressNftCollections(address) {
  const url = `${BASE}/addresses/${address}/nft/collections?type=ERC-721,ERC-1155`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Blockscout NFT collections request failed (${resp.status}): ${text.slice(0, 200)}`);
  }
  const json = await resp.json();
  return json?.items || [];
}

function buildInsights(
  address,
  txs2025,
  transfers2025,
  erc20Transfers,
  ethHistory,
  nftCollections,
) {
  const totalTransactions = txs2025.length;
  const totalVolumeEth = txs2025.reduce((sum, tx) => sum + Number(tx?.value || "0") / 1e18, 0);

  const byDay = new Map();
  for (const tx of txs2025) {
    const day = (tx?.timestamp || "").slice(0, 10); // YYYY-MM-DD
    if (!day) continue;
    byDay.set(day, (byDay.get(day) || 0) + 1);
  }
  const biggestDayEntry = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const biggestDay = biggestDayEntry
    ? {
        label: formatDay(biggestDayEntry[0]),
        txs: biggestDayEntry[1],
        minutes: biggestDayEntry[1] * 2, // simple heuristic
      }
    : { label: "No 2025 activity yet", txs: 0, minutes: 0 };

  // NFT mints: ERC-721/1155 transfers where from.hash is zero address.
  const zeroAddr = "0x0000000000000000000000000000000000000000";
  const nftMints = transfers2025.filter((tr) => {
    const fromHash = tr?.from?.hash?.toLowerCase?.() || "";
    return fromHash === zeroAddr;
  });
  const nftsMinted = nftMints.length;
  const collectionCount = new Map();
  for (const tr of nftMints) {
    const key =
      tr?.token?.name ||
      tr?.token?.address_hash ||
      "Unknown collection";
    collectionCount.set(key, (collectionCount.get(key) || 0) + 1);
  }
  const topCollectionEntry = [...collectionCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const topCollection = topCollectionEntry ? topCollectionEntry[0] : "Unknown collection";

  const bridgeCount = txs2025.filter((tx) => isBridgeTx(tx)).length;

  const uniqueDays = new Set(
    txs2025
      .map((t) => (t?.timestamp || "").slice(0, 10))
      .filter(Boolean)
  );
  const gmStreak = uniqueDays.size;

  const firstTouch =
    txs2025.length > 0
      ? txs2025
          .slice()
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0]
          .timestamp.slice(0, 10)
      : "No activity yet";

  const mintStory = [
    "Arbitrum Unwrapped 2025",
    `${totalTransactions} txs`,
    `${totalVolumeEth.toFixed(2)} ETH moved`,
    `Biggest day: ${biggestDay.label}`,
  ].join(" · ");

  const tokenHabits = summarizeTokenHabits(erc20Transfers);
  const ethJourney = summarizeEthJourney(ethHistory);
  const nftSnapshot = summarizeNftCollections(nftCollections);
  const streaks = summarizeStreaks(txs2025);
  const dappDiversity = summarizeDappDiversity(txs2025);

  return {
    totalTransactions,
    totalVolumeEth: Number(totalVolumeEth.toFixed(4)),
    biggestDay,
    nftsMinted,
    topCollection,
    bridgeCount,
    gmStreak,
    firstTouch,
    mintStory,
    tokenHabits,
    ethJourney,
    nftSnapshot,
    streaks,
    dappDiversity,
  };
}

function isBridgeTx(tx) {
  const to = tx?.to || {};
  const tagStrings = [];
  if (Array.isArray(to.public_tags)) {
    for (const t of to.public_tags) {
      if (t?.display_name) tagStrings.push(t.display_name);
      if (t?.name) tagStrings.push(t.name);
    }
  }
  if (Array.isArray(to.watchlist_names)) {
    for (const t of to.watchlist_names) {
      if (t?.display_name) tagStrings.push(t.display_name);
      if (t?.name) tagStrings.push(t.name);
    }
  }
  const candidates = [
    to?.metadata?.name,
    to?.metadata?.slug,
    to?.name,
    to?.hash,
    ...tagStrings,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

  return candidates.some((s) => s.includes("bridge"));
}

function formatDay(isoDate) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return String(isoDate);
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const day = d.toLocaleString("en-US", { day: "2-digit", timeZone: "UTC" });
  const year = d.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

function pickReadableDestination(tx) {
  const to = tx?.to || {};
  const tagStrings = [];
  if (Array.isArray(to.public_tags)) {
    for (const t of to.public_tags) {
      if (t?.display_name) tagStrings.push(t.display_name);
      if (t?.name) tagStrings.push(t.name);
    }
  }
  if (Array.isArray(to.watchlist_names)) {
    for (const t of to.watchlist_names) {
      if (t?.display_name) tagStrings.push(t.display_name);
      if (t?.name) tagStrings.push(t.name);
    }
  }

  const candidates = [
    ...tagStrings,
    to?.metadata?.name,
    to?.metadata?.slug,
    to?.name,
    to?.hash,
  ].filter(Boolean);

  // Prefer descriptive names over short, all-caps symbols (e.g., "USDC").
  const descriptive = candidates.find((c) => !/^[A-Z0-9]{2,8}$/.test(String(c)));
  return (descriptive || candidates[0] || "Unknown").toString();
}

function summarizeTokenHabits(transfers) {
  const stableSymbols = new Set(["usdc", "usdc.e", "usdt", "dai", "usde", "frax", "lusd", "gusd", "busd"]);
  const byToken = new Map();
  for (const tr of transfers) {
    const token = tr?.token || {};
    const decimals = Number(token.decimals ?? 18);
    const symbol = (token.symbol || token.address_hash || "Unknown").toString();
    const addr = token.address_hash || symbol;
    const valueRaw = Number(tr?.total?.value || "0");
    const value = valueRaw / 10 ** (Number.isFinite(decimals) ? decimals : 18);
    const key = addr.toLowerCase();
    const bucket = byToken.get(key) || { symbol, addr, sent: 0, received: 0, count: 0 };
    if (tr?.from?.hash?.toLowerCase?.() === tr?.to?.hash?.toLowerCase?.()) {
      bucket.count += 1;
    } else if (tr?.from?.hash?.toLowerCase?.() === tr?.address_hash?.toLowerCase?.()) {
      bucket.sent += value;
      bucket.count += 1;
    } else if (tr?.to?.hash?.toLowerCase?.() === tr?.address_hash?.toLowerCase?.()) {
      bucket.received += value;
      bucket.count += 1;
    } else {
      bucket.count += 1;
    }
    byToken.set(key, bucket);
  }
  const tokens = [...byToken.values()];
  const topByVolume = tokens.sort((a, b) => b.sent + b.received - (a.sent + a.received))[0];
  const topByCount = tokens.sort((a, b) => b.count - a.count)[0];
  const stablePick = tokens.find((t) => stableSymbols.has(t.symbol.toLowerCase()));
  return {
    topVolumeSymbol: topByVolume?.symbol || "Unknown",
    topVolumeAmount: Number(((topByVolume?.sent || 0) + (topByVolume?.received || 0)).toFixed(4)),
    topCountSymbol: topByCount?.symbol || "Unknown",
    topCountTransfers: topByCount?.count || 0,
    stablePreference: stablePick ? stablePick.symbol : "None",
  };
}

function summarizeEthJourney(history) {
  const entries2025 = history.filter((h) => {
    const date = h?.date || h?.day || h?.timestamp;
    if (!date) return false;
    return new Date(date).getUTCFullYear() === 2025;
  });
  if (entries2025.length === 0) {
    return {
      start: 0,
      end: 0,
      peak: 0,
      changePercent: 0,
      biggestSwing: 0,
    };
  }
  const normalized = entries2025
    .map((h) => {
      const balance = Number(h?.value || h?.balance || h?.coin_balance || 0) / 1e18;
      const date = h?.date || h?.day || h?.timestamp;
      return { date, balance };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const start = normalized[0].balance;
  const end = normalized[normalized.length - 1].balance;
  const peak = Math.max(...normalized.map((e) => e.balance));
  let biggestSwing = 0;
  for (let i = 1; i < normalized.length; i += 1) {
    const swing = normalized[i].balance - normalized[i - 1].balance;
    if (Math.abs(swing) > Math.abs(biggestSwing)) biggestSwing = swing;
  }
  const changePercent = start === 0 ? 0 : ((end - start) / start) * 100;
  return {
    start: Number(start.toFixed(4)),
    end: Number(end.toFixed(4)),
    peak: Number(peak.toFixed(4)),
    changePercent: Number(changePercent.toFixed(1)),
    biggestSwing: Number(biggestSwing.toFixed(4)),
  };
}

function summarizeNftCollections(nftCollections) {
  const held = nftCollections.filter((c) => Number(c?.amount || 0) > 0);
  const uniqueHeld = held.length;
  let eventCity = "None";
  let oldestEventYear = null;
  let eventCount = 0;
  for (const col of held) {
    for (const inst of col?.token_instances || []) {
      const meta = inst?.metadata || {};
      const tags = meta?.tags || [];
      const attrs = meta?.attributes || [];
      const yearAttr = attrs.find((a) => String(a?.trait_type || "").toLowerCase() === "year");
      if (tags.some((t) => String(t).toLowerCase().includes("event") || String(t).toLowerCase().includes("poap"))) {
        eventCount += 1;
      }
      const cityAttr = attrs.find((a) => String(a?.trait_type || "").toLowerCase() === "city");
      if (cityAttr?.value && eventCity === "None") {
        eventCity = String(cityAttr.value);
      }
      if (yearAttr?.value) {
        const yr = Number(yearAttr.value);
        if (!Number.isNaN(yr)) {
          if (oldestEventYear === null || yr < oldestEventYear) oldestEventYear = yr;
        }
      }
    }
  }
  return {
    collectionsHeld: uniqueHeld,
    eventCity: eventCity || "None",
    oldestEventYear: oldestEventYear || "None",
    eventBadgeCount: eventCount,
  };
}

function summarizeStreaks(txs2025) {
  const days = [...new Set(txs2025.map((t) => (t?.timestamp || "").slice(0, 10)).filter(Boolean))].sort();
  let longest = 0;
  let current = 0;
  let prevDay = null;
  for (const day of days) {
    if (!prevDay) {
      current = 1;
    } else {
      const diff =
        (new Date(day).getTime() - new Date(prevDay).getTime()) / (1000 * 60 * 60 * 24);
      current = diff === 1 ? current + 1 : 1;
    }
    longest = Math.max(longest, current);
    prevDay = day;
  }

  const hourBuckets = {
    "00-05": 0,
    "06-11": 0,
    "12-17": 0,
    "18-23": 0,
  };
  for (const tx of txs2025) {
    const ts = tx?.timestamp;
    if (!ts) continue;
    const hour = new Date(ts).getUTCHours();
    if (hour <= 5) hourBuckets["00-05"] += 1;
    else if (hour <= 11) hourBuckets["06-11"] += 1;
    else if (hour <= 17) hourBuckets["12-17"] += 1;
    else hourBuckets["18-23"] += 1;
  }
  const dominantHour = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0]?.[0] || "00-05";

  return {
    longestConsecutiveDays: longest,
    dominantHourBucket: dominantHour,
  };
}

function summarizeDappDiversity(txs2025) {
  const destinations = new Map();
  for (const tx of txs2025) {
    const dest = pickReadableDestination(tx);
    destinations.set(dest, (destinations.get(dest) || 0) + 1);
  }
  const uniqueCount = destinations.size;

  const keywords = [
    { cat: "DEX", terms: ["swap", "dex", "uniswap", "camelot", "gmx", "balancer", "curve", "router"] },
    { cat: "Bridge", terms: ["bridge", "hop", "stargate", "router", "across"] },
    { cat: "Lending", terms: ["lend", "aave", "compound", "gearbox", "credit"] },
    { cat: "NFT Market", terms: ["nft", "market", "opensea", "blur", "rarible", "trove"] },
  ];
  const catCounts = new Map();
  for (const [dest] of destinations) {
    const lower = dest.toLowerCase();
    let matched = "Other";
    for (const k of keywords) {
      if (k.terms.some((t) => lower.includes(t))) {
        matched = k.cat;
        break;
      }
    }
    catCounts.set(matched, (catCounts.get(matched) || 0) + 1);
  }
  const topCategory = [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Other";

  return {
    uniqueDapps: uniqueCount,
    topCategory,
  };
}

function sanitizePageParams(next) {
  const params = {};
  if (next?.block_number !== undefined && next?.block_number !== null) params.block_number = Number(next.block_number);
  if (next?.index !== undefined && next?.index !== null) params.index = Number(next.index);
  if (next?.items_count !== undefined && next?.items_count !== null) params.items_count = Number(next.items_count);
  return params;
}
