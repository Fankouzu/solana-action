import {
  ACTIONS_CORS_HEADERS,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  MEMO_PROGRAM_ID,
  createActionHeaders,
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
// create the standard headers for this route (including CORS)
const headers = createActionHeaders({ chainId: "mainnet", actionVersion: "1" });
export const GET = (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const baseHref = new URL(
      `/api/actions/ticket`,
      requestUrl.origin
    ).toString();
    const payload: ActionGetResponse = {
      icon: new URL("/image.png", new URL(req.url).origin).toString(),
      title: "课程标题？",
      disabled: false,
      description:
        `课程简介`,
      label: "Demo",
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
      headers,
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
    // 添加重试逻辑
    const getRecentBlockhash = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const { blockhash } = await connection.getLatestBlockhash();
          return blockhash;
        } catch (error) {
          console.error(`获取最新区块哈希失败，尝试次数：${i + 1}`, error);
          if (i === retries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后重试
        }
      }
    };
    transaction.recentBlockhash = await getRecentBlockhash();
    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
      },
    });
    return Response.json(payload, {
      headers,
    });
  } catch (err) {
    console.log(err);
    return Response.json("An unknow error occurred", { status: 400 });
  }
};