import {
  ACTIONS_CORS_HEADERS,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  MEMO_PROGRAM_ID,
  createPostResponse,
} from "@solana/actions";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
} from "@solana/web3.js";
import dotenv from "dotenv";

dotenv.config();
const amount = 0.05;
const toPubkey = new PublicKey("Bm3iBh2Th3n1QjJg1LLYfmpuqbV5V2dBomaEk5utsy8a");
export const GET = (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const baseHref = new URL(
      `/api/actions/ticket`,
      requestUrl.origin
    ).toString();
    const payload: ActionGetResponse = {
      icon: new URL("/event_20240808.jpg", new URL(req.url).origin).toString(),
      title: "Blinks到底容不容易被封？",
      disabled:true,
      description:
        `8月8日20:00（UTC+8），Solana技术专家带你了解Blink底层原理，最新进展、Twitter相关、Chrome相关，最终去论证Blinks到底容不容易被封？
付费公开课：0.05 SOL`,
      label: "Memo Demo",
      links: {
        actions: [
          {
            label: "Buy",
            href: `${baseHref}?email={email}`,
            parameters: [
              {
                name: "email",
                label: "请输入接收门票的邮箱",
                required: true,
              },
            ],
          },
        ],
      },
    };
    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    console.log(err);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};

export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const body: ActionPostRequest = await req.json();

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return new Response("Invalid 'account' provided", {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const transaction = new Transaction();
    const requestUrl = new URL(req.url);
    const email = requestUrl.searchParams.get("email") || "";

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: toPubkey,
        lamports: amount * LAMPORTS_PER_SOL,
      }),
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(email, "utf8"),
        keys: [],
      })
    );

    transaction.feePayer = account;

    const connection = new Connection(
      process.env.RPC_URL_MAINNET ?? clusterApiUrl("mainnet-beta")
    );
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
      },
    });

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    return Response.json("An unknow error occurred", { status: 400 });
  }
};
