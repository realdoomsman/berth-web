import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { env } from "../env.js";

export const connection = new Connection(env.solanaRpcUrl, "confirmed");

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

const ata = (owner: PublicKey, mint: PublicKey): PublicKey =>
  PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];

/** Read-only balance of a custodial wallet address, in SOL. */
export const getSolBalance = async (address: string): Promise<number> =>
  (await connection.getBalance(new PublicKey(address), "confirmed")) / LAMPORTS_PER_SOL;

/** Read-only SPL token balance of a custodial wallet, in base units. */
export const getTokenBalance = async (owner: string, mint: string): Promise<bigint> => {
  const res = await connection.getTokenAccountBalance(ata(new PublicKey(owner), new PublicKey(mint)), "confirmed").catch(() => null);
  return res ? BigInt(res.value.amount) : 0n;
};
