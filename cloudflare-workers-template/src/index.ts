import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
} from "@solana/actions";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Buffer } from "node:buffer";

if (globalThis.Buffer === undefined) {
  globalThis.Buffer = Buffer;
}
const DEFAULT_SOL_ADDRESS: PublicKey = new PublicKey(
  "Cuigpd5P2LWTw1KDLWRuyCnA5xFuwUPEZhhZzr54ZL33" // donate wallet
);
const DEFAULT_SOL_AMOUNT: number = 0.1; // amount

// you should use a private RPC here
const connection = new Connection("https://api.mainnet-beta.solana.com");

const app = new Hono();

app.use(cors());

app.get("/", (c) => {
  const requestUrl = new URL(c.req.url);
  const { amount } = validatedQueryParams(requestUrl);
  const response: ActionGetResponse = {
    title: "Send me some SOL",
    description: "This is a simple action that allows to tip a creator",
    icon: "https://img.fotofolio.xyz/?url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FSo11111111111111111111111111111111111111112%2Flogo.png",
    label: `Tip ${amount} SOL`,
  };

  return c.json(response);
});

app.post("/", async (c) => {
  const requestUrl = new URL(c.req.url);
  const { amount, toPubkey } = validatedQueryParams(requestUrl);
  const req = await c.req.json<ActionPostRequest>();

  const transaction = await prepareTransaction(
    new PublicKey(req.account),
    amount,
    toPubkey
  );

  const response: ActionPostResponse = {
    transaction: Buffer.from(transaction.serialize()).toString("base64"),
  };

  return c.json(response);
});

async function prepareTransaction(
  payer: PublicKey,
  amount: number,
  toPubkey: PublicKey
) {
  const transferIx = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: toPubkey,
    lamports: amount,
  });

  const blockhash = await connection
    .getLatestBlockhash({ commitment: "max" })
    .then((res) => res.blockhash);
  const messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: [transferIx],
  }).compileToV0Message();
  return new VersionedTransaction(messageV0);
}

function validatedQueryParams(requestUrl: URL) {
  let toPubkey: PublicKey = DEFAULT_SOL_ADDRESS;
  let amount: number = DEFAULT_SOL_AMOUNT;

  try {
    if (requestUrl.searchParams.get("to")) {
      toPubkey = new PublicKey(requestUrl.searchParams.get("to")!);
    }
  } catch (err) {
    throw "Invalid input query parameter: to";
  }

  try {
    if (requestUrl.searchParams.get("amount")) {
      amount = parseFloat(requestUrl.searchParams.get("amount")!);
    }

    if (amount <= 0) throw "amount is too small";
  } catch (err) {
    throw "Invalid input query parameter: amount";
  }

  return {
    amount,
    toPubkey,
  };
}

export default app;
