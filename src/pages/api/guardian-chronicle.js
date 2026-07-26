import { neon } from "@neondatabase/serverless";

const CUBE_ADDRESS =
  "0x30e1076bDf2B123B54486C2721125388af2d2061".toLowerCase();

const ALLOWED_ORIGINS = [
  "https://energon-site.vercel.app",
  "https://energon-dapp.vercel.app",
  "http://localhost:3000",
  "http://localhost:8080",
];

function setCors(req, res) {
  const origin = req.headers.origin;

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function padAddress(address) {
  return address.toLowerCase().replace("0x", "").padStart(64, "0");
}

function padUint(value) {
  return BigInt(value).toString(16).padStart(64, "0");
}

function decodeAddress(hex) {
  if (!hex || hex === "0x") return "";
  return "0x" + hex.slice(-40).toLowerCase();
}

async function rpcCall(to, data) {
  const rpcUrl = process.env.FLARE_RPC || process.env.FLR_RPC;

  if (!rpcUrl) {
    throw new Error("Missing FLARE_RPC environment variable.");
  }

  const rpcResponse = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });

  const json = await rpcResponse.json();

  if (!rpcResponse.ok) {
    throw new Error(`RPC request failed: ${rpcResponse.status}`);
  }

  if (json.error) {
    throw new Error(json.error.message || "RPC error");
  }

  if (!json.result) {
    throw new Error("RPC returned no result.");
  }

  return json.result;
}

async function cubeBalanceOf(wallet) {
  const data = "0x70a08231" + padAddress(wallet);
  const result = await rpcCall(CUBE_ADDRESS, data);

  return BigInt(result);
}

async function ownerOf(cubeId) {
  const data = "0x6352211e" + padUint(cubeId);
  const result = await rpcCall(CUBE_ADDRESS, data);

  return decodeAddress(result);
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed.",
      });
    }

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: "DATABASE_URL environment variable is missing.",
      });
    }

    const {
      wallet,
      cubeId,
      guardianName,
      recordText,
      publicPermission,
      bookPermission,
    } = req.body || {};

    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: "Invalid wallet.",
      });
    }

    const cleanCubeId = String(cubeId || "").trim();

    if (!/^[0-9]+$/.test(cleanCubeId)) {
      return res.status(400).json({
        error: "EnergonCube number required.",
      });
    }

    const cubeNumber = BigInt(cleanCubeId);

    if (cubeNumber < 1n || cubeNumber > 1000000n) {
      return res.status(400).json({
        error: "Invalid EnergonCube number.",
      });
    }

    const cleanRecord = String(recordText || "").trim();
    const cleanName = String(guardianName || "").trim();

    if (cleanRecord.length < 3) {
      return res.status(400).json({
        error: "Guardian record required.",
      });
    }

    if (cleanRecord.length > 1000) {
      return res.status(400).json({
        error: "Record too long.",
      });
    }

    if (cleanName.length > 80) {
      return res.status(400).json({
        error: "Guardian name too long.",
      });
    }

    const normalizedWallet = wallet.toLowerCase();
    const balance = await cubeBalanceOf(normalizedWallet);

    if (balance !== 1n) {
      return res.status(403).json({
        error: "Wallet is not coherent.",
        cubeBalance: balance.toString(),
      });
    }

    const cubeOwner = await ownerOf(cubeNumber);

    if (cubeOwner.toLowerCase() !== normalizedWallet) {
      return res.status(403).json({
        error: "Entered EnergonCube is not held by this wallet.",
      });
    }

    const sql = neon(process.env.DATABASE_URL);
    console.log("DATABASE_URL exists:", Boolean(process.env.DATABASE_URL));

    try {
      const databaseUrl = new URL(process.env.DATABASE_URL);
      console.log("DATABASE_URL host:", databaseUrl.host);
    } catch {
      console.log("DATABASE_URL host: INVALID_URL");
    }

    const savedRows = await sql`
      INSERT INTO guardian_records (
        wallet,
        cube_id,
        cube_balance,
        guardian_name,
        record_text,
        public_permission,
        book_permission,
        status
      )
      VALUES (
        ${normalizedWallet},
        ${Number(cubeNumber)},
        ${Number(balance)},
        ${cleanName || null},
        ${cleanRecord},
        ${Boolean(publicPermission)},
        ${Boolean(bookPermission)},
        'submitted'
      )
      RETURNING
        id,
        created_at,
        wallet,
        cube_id,
        cube_balance,
        guardian_name,
        record_text,
        public_permission,
        book_permission,
        status
    `;

    const savedRecord =
      Array.isArray(savedRows) && savedRows.length > 0
        ? savedRows[0]
        : null;

    if (!savedRecord) {
      throw new Error(
        "Neon saved the request but did not return the inserted record."
      );
    }

    if (
      savedRecord.id === undefined ||
      savedRecord.created_at === undefined
    ) {
      throw new Error(
        "Neon record is missing id or created_at."
      );
    }

    return res.status(200).json({
      ok: true,
      message: "Guardian Record received.",
      cubeId: cleanCubeId,
      record: savedRecord,
    });
  } catch (err) {
    console.error("guardian-chronicle error:", err);

    return res.status(500).json({
      error: "Guardian record could not be saved.",
    });
  }
}
