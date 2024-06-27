import {
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
} from "@solana/actions";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  ExtensionType,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
} from "@solana/spl-token";
import {
  TokenMetadata,
  createInitializeInstruction,
  pack,
} from "@solana/spl-token-metadata";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import dotenv from "dotenv";
import { DEFAULT_SOL_ADDRESS } from "../donate/const";
dotenv.config();

const fee = 0.01;

export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);

    const baseHref = new URL(
      `/api/actions/token`,
      requestUrl.origin
    ).toString();

    const payload: ActionGetResponse = {
      title: "一键发行Solana Token",
      icon: new URL("/solana_devs.jpg", requestUrl.origin).toString(),
      description: `输入Metadata发行数字货币,用逗号分隔,格式:名称,缩写,数量;例如:USD Coin,USDC,100000;手续费:${fee} SOL`,
      label: "",
      links: {
        actions: [
          {
            label: "发射",
            href: `${baseHref}?metadata={metadata}`,
            parameters: [
              {
                name: "metadata",
                label: "USD Coin,USDC,100000",
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

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const { name, symbol, amount } = validatedQueryParams(requestUrl);
    const uri =
      "https://arweave.net/3VERGxufuPOeXaqXgui2xLrtYO6n1mJxu0QqBi99qBY";

    const body: ActionPostRequest = await req.json();

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return new Response('Invalid "account" provided', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const connection = new Connection(
      process.env.RPC_URL_MAINNET ?? clusterApiUrl("mainnet-beta")
    );

    const mint = Keypair.generate();
    const decimals = 9;

    const associatedToken = getAssociatedTokenAddressSync(
      mint.publicKey,
      account,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const amountOfTokensToMint = amount * 10 ** decimals;

    const metadata: TokenMetadata = {
      mint: mint.publicKey,
      name: name,
      symbol: symbol,
      uri: uri,
      additionalMetadata: [],
    };

    const mintLen = getMintLen([ExtensionType.MetadataPointer]);

    const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

    const mintLamports = await connection.getMinimumBalanceForRentExemption(
      mintLen + metadataLen
    );

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: DEFAULT_SOL_ADDRESS,
        lamports: fee * LAMPORTS_PER_SOL,
      }),
      SystemProgram.createAccount({
        fromPubkey: account,
        newAccountPubkey: mint.publicKey,
        space: mintLen,
        lamports: mintLamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeMetadataPointerInstruction(
        mint.publicKey,
        account,
        mint.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeMintInstruction(
        mint.publicKey,
        decimals,
        account,
        null,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        mint: mint.publicKey,
        metadata: mint.publicKey,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        mintAuthority: account,
        updateAuthority: account,
      }),
      createAssociatedTokenAccountIdempotentInstruction(
        account,
        associatedToken,
        account,
        mint.publicKey,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      ),
      createMintToInstruction(
        mint.publicKey,
        associatedToken,
        account,
        amountOfTokensToMint,
        undefined,
        TOKEN_2022_PROGRAM_ID
      )
    );

    // set the end user as the fee payer
    transaction.feePayer = account;

    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: `Create ${amount} ${symbol} to ${account.toBase58()}`,
      },
      signers: [mint],
    });

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

function validatedQueryParams(requestUrl: URL) {
  const metadataParams = requestUrl.searchParams.get("metadata");
  const metadata = metadataParams?.split(",");
  try {
    if (metadata != undefined && metadata.length == 3) {
      const name = decodeURI(metadata[0]);
      const symbol = decodeURI(metadata[1]);
      const amount = parseInt(metadata[2]);
      return { name, symbol, amount };
    } else {
      throw "Invalid input query parameter";
    }
  } catch (err) {
    throw "Invalid input query parameter";
  }
}
