import { useCallback, useEffect, useRef, useState } from "react";
import { parseAbiItem } from "viem";

function isAddr(a) {
  return typeof a === "string" && a.startsWith("0x") && a.length === 42;
}

function safeError(extractError, e, fallback) {
  try {
    return typeof extractError === "function"
      ? extractError(e) || fallback
      : fallback;
  } catch {
    return fallback;
  }
}

function claimIsTimeExpired(nowTs, expiryTime, claimedBool, expiredBool) {
  if (claimedBool || expiredBool) return expiredBool;
  if (nowTs == null) return false;
  if (typeof expiryTime !== "bigint" || expiryTime <= 0n) return false;
  return nowTs > expiryTime;
}

export default function useEmpClaims({
  publicClient,
  vaultAddress,
  isConnected,
  address,
  EVaultAbi,
  extractError,
}) {
  const [claimLookbackBlocks, setClaimLookbackBlocks] = useState(200000);

  const [claimsOpen, setClaimsOpen] = useState(false);
  const [claimsBusy, setClaimsBusy] = useState(false);
  const [claimsNote, setClaimsNote] = useState("");
  const [pendingClaims, setPendingClaims] = useState([]);
  const [lastClaimsSync, setLastClaimsSync] = useState(null);

  const [pastClaimsOpen, setPastClaimsOpen] = useState(false);
  const [pastClaimsBusy, setPastClaimsBusy] = useState(false);
  const [pastClaimsNote, setPastClaimsNote] = useState("");
  const [pastClaims, setPastClaims] = useState([]);
  const [lastPastClaimsSync, setLastPastClaimsSync] = useState(null);

  const mountedRef = useRef(true);
  const claimsSyncingRef = useRef(false);
  const pastClaimsSyncingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const readClaimIdsForWallet = useCallback(async () => {
    const block = await publicClient.getBlock();

    const nowTs = typeof block?.timestamp === "bigint" ? block.timestamp : null;

    const latest = typeof block?.number === "bigint" ? block.number : null;

    if (latest == null) {
      throw new Error("Could not read latest block number.");
    }

    const lookback = BigInt(
      Number.isFinite(claimLookbackBlocks) && claimLookbackBlocks > 0
        ? Math.floor(claimLookbackBlocks)
        : 200000,
    );

    const fromBlock = latest > lookback ? latest - lookback : 0n;

    const committedEvent = parseAbiItem(
      "event Committed(uint256 indexed claimId, address indexed user, uint8 indexed direction, uint256 inAmountReceived, uint256 feeInAmount, uint256 outAmountNet, uint256 feeOutAmount, uint256 unlockTime)",
    );

    const logs = await publicClient.getLogs({
      address: vaultAddress,
      event: committedEvent,
      args: { user: address },
      fromBlock,
      toBlock: latest,
    });

    const ids = Array.from(
      new Set(
        logs
          .map((lg) => lg?.args?.claimId)
          .filter((x) => typeof x === "bigint"),
      ),
    ).sort((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });

    return { ids, nowTs };
  }, [publicClient, vaultAddress, address, claimLookbackBlocks]);

  const readClaimsByIds = useCallback(
    async (ids) => {
      const reads = ids.map((id) =>
        publicClient
          .readContract({
            address: vaultAddress,
            abi: EVaultAbi,
            functionName: "claims",
            args: [id],
          })
          .then((c) => ({ id, c }))
          .catch(() => null),
      );

      return (await Promise.all(reads)).filter(Boolean);
    },
    [publicClient, vaultAddress, EVaultAbi],
  );

  const mapClaim = useCallback(
    ({ id, c }, nowTs) => {
      const user = c?.[0];
      const direction = c?.[1];
      const inAmount = c?.[2];
      const feeInAmount = c?.[3];
      const outAmountNet = c?.[4];
      const feeOutAmount = c?.[5];
      const maturityFeeOutAmount = c?.[6];
      const maturityTier = c?.[7];
      const unlockTime = c?.[8];
      const expiryTime = c?.[9];
      const claimed = c?.[10];
      const expired = c?.[11];

      const me = String(address).toLowerCase();
      const ownerOk = typeof user === "string" && user.toLowerCase() === me;

      const claimedBool = claimed === true;
      const rawExpired = expired === true;
      const timeExpired = claimIsTimeExpired(
        nowTs,
        expiryTime,
        claimedBool,
        rawExpired,
      );

      const expiredBool = rawExpired || timeExpired;

      const ready =
        nowTs != null &&
        typeof unlockTime === "bigint" &&
        nowTs >= unlockTime &&
        !claimedBool &&
        !expiredBool;

      const remainingSec =
        nowTs != null && typeof unlockTime === "bigint" && unlockTime > nowTs
          ? unlockTime - nowTs
          : 0n;

      const expiryRemainingSec =
        nowTs != null &&
        typeof expiryTime === "bigint" &&
        expiryTime > nowTs &&
        !claimedBool &&
        !expiredBool
          ? expiryTime - nowTs
          : 0n;

      return {
        id,
        ownerOk,
        direction,
        inAmount,
        feeInAmount,
        feeOutAmount,
        maturityFeeOutAmount,
        maturityTier,
        outAmountNet,
        unlockTime,
        expiryTime,
        claimed: claimedBool,
        expired: expiredBool,
        rawExpired,
        timeExpired,
        needsCleanup: timeExpired && !rawExpired && !claimedBool,
        ready,
        remainingSec,
        expiryRemainingSec,
      };
    },
    [address],
  );

  const syncClaimsForWallet = useCallback(async () => {
    if (claimsSyncingRef.current) return;
    claimsSyncingRef.current = true;

    if (!publicClient) {
      if (mountedRef.current) {
        setClaimsNote("No public client.");
        setPendingClaims([]);
      }
      claimsSyncingRef.current = false;
      return;
    }

    if (!isAddr(vaultAddress)) {
      if (mountedRef.current) {
        setClaimsNote("Vault address missing.");
        setPendingClaims([]);
      }
      claimsSyncingRef.current = false;
      return;
    }

    if (!isConnected || !address) {
      if (mountedRef.current) {
        setClaimsNote("Connect wallet to view claims.");
        setPendingClaims([]);
      }
      claimsSyncingRef.current = false;
      return;
    }

    if (mountedRef.current) {
      setClaimsBusy(true);
      setClaimsNote("");
    }

    try {
      const { ids, nowTs } = await readClaimIdsForWallet();

      if (!ids.length) {
        if (mountedRef.current) {
          setPendingClaims([]);
          setLastClaimsSync(Date.now());
          setClaimsNote(
            "No pending claims for this wallet (in lookback range).",
          );
        }
        return;
      }

      const results = await readClaimsByIds(ids);

      const mapped = results
        .map((item) => mapClaim(item, nowTs))
        .filter((x) => x.ownerOk && !x.claimed && !x.rawExpired)
        .sort((a, b) => {
          const au = typeof a.unlockTime === "bigint" ? a.unlockTime : 0n;
          const bu = typeof b.unlockTime === "bigint" ? b.unlockTime : 0n;
          if (au < bu) return -1;
          if (au > bu) return 1;
          if (a.id < b.id) return -1;
          if (a.id > b.id) return 1;
          return 0;
        });

      if (mountedRef.current) {
        setPendingClaims(mapped);
        setLastClaimsSync(Date.now());
        setClaimsNote(
          mapped.length ? "" : "No pending claims for this wallet.",
        );
      }
    } catch (e) {
      if (mountedRef.current) {
        setClaimsNote(
          safeError(extractError, e, "Failed to sync pending claims."),
        );
        setPendingClaims([]);
      }
    } finally {
      if (mountedRef.current) {
        setClaimsBusy(false);
      }
      claimsSyncingRef.current = false;
    }
  }, [
    publicClient,
    vaultAddress,
    isConnected,
    address,
    extractError,
    readClaimIdsForWallet,
    readClaimsByIds,
    mapClaim,
  ]);

  const syncPastClaimsForWallet = useCallback(async () => {
    if (pastClaimsSyncingRef.current) return;
    pastClaimsSyncingRef.current = true;

    if (!publicClient) {
      if (mountedRef.current) {
        setPastClaimsNote("No public client.");
        setPastClaims([]);
      }
      pastClaimsSyncingRef.current = false;
      return;
    }

    if (!isAddr(vaultAddress)) {
      if (mountedRef.current) {
        setPastClaimsNote("Vault address missing.");
        setPastClaims([]);
      }
      pastClaimsSyncingRef.current = false;
      return;
    }

    if (!isConnected || !address) {
      if (mountedRef.current) {
        setPastClaimsNote("Connect wallet to view past claims.");
        setPastClaims([]);
      }
      pastClaimsSyncingRef.current = false;
      return;
    }

    if (mountedRef.current) {
      setPastClaimsBusy(true);
      setPastClaimsNote("");
    }

    try {
      const { ids, nowTs } = await readClaimIdsForWallet();

      if (!ids.length) {
        if (mountedRef.current) {
          setPastClaims([]);
          setLastPastClaimsSync(Date.now());
          setPastClaimsNote("No past claims found (in lookback range).");
        }
        return;
      }

      const results = await readClaimsByIds(ids);

      const mapped = results
        .map((item) => mapClaim(item, nowTs))
        .filter((x) => x.ownerOk && (x.claimed || x.rawExpired))
        .sort((a, b) => {
          const au = typeof a.unlockTime === "bigint" ? a.unlockTime : 0n;
          const bu = typeof b.unlockTime === "bigint" ? b.unlockTime : 0n;
          if (au > bu) return -1;
          if (au < bu) return 1;
          if (a.id > b.id) return -1;
          if (a.id < b.id) return 1;
          return 0;
        });

      if (mountedRef.current) {
        setPastClaims(mapped);
        setLastPastClaimsSync(Date.now());
        setPastClaimsNote(
          mapped.length ? "" : "No claimed or expired history for this wallet.",
        );
      }
    } catch (e) {
      if (mountedRef.current) {
        setPastClaimsNote(
          safeError(extractError, e, "Failed to sync past claims."),
        );
        setPastClaims([]);
      }
    } finally {
      if (mountedRef.current) {
        setPastClaimsBusy(false);
      }
      pastClaimsSyncingRef.current = false;
    }
  }, [
    publicClient,
    vaultAddress,
    isConnected,
    address,
    extractError,
    readClaimIdsForWallet,
    readClaimsByIds,
    mapClaim,
  ]);

  useEffect(() => {
    if (!claimsOpen) return;
    syncClaimsForWallet();
  }, [claimsOpen, syncClaimsForWallet]);

  useEffect(() => {
    if (!pastClaimsOpen) return;
    syncPastClaimsForWallet();
  }, [pastClaimsOpen, syncPastClaimsForWallet]);

  return {
    claimLookbackBlocks,
    setClaimLookbackBlocks,

    claimsOpen,
    setClaimsOpen,
    claimsBusy,
    claimsNote,
    pendingClaims,
    lastClaimsSync,

    pastClaimsOpen,
    setPastClaimsOpen,
    pastClaimsBusy,
    pastClaimsNote,
    pastClaims,
    lastPastClaimsSync,

    syncClaimsForWallet,
    syncPastClaimsForWallet,
  };
}
