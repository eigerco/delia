import { CID } from "multiformats/cid";
import { z } from "zod";

namespace DealResult {
  export const schema = z.object({
    storageProviderPeerId: z.string(),
    storageProviderAccountId: z.string(),
    dealId: z.number(),
  });
}

// This is not great
type DealResult = {
  storageProviderPeerId: string;
  storageProviderAccountId: string;
  dealId: number;
};

const cidSchema = z.string().transform((s, ctx) => {
  // Reference (zod v3): https://zod.dev/?id=validating-during-transform
  try {
    const cid = CID.parse(s);
    if (!cid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid CID",
      });
      return z.NEVER;
    }
    return cid;
  } catch (e) {
    if (e instanceof Error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: e.message,
      });
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: e as string, // ¯\_(ツ)_/¯
      });
    }
    return z.NEVER;
  }
});

export class SubmissionReceipt {
  deals: DealResult[];
  pieceCid: CID;
  payloadCid: CID;
  filename: string;
  startBlock: number;
  endBlock: number;

  private static readonly SCHEMA = z.object({
    deals: z.array(DealResult.schema),
    pieceCid: cidSchema,
    payloadCid: cidSchema,
    filename: z.string(),
    startBlock: z.number(),
    endBlock: z.number(),
  });

  constructor(
    deals: DealResult[],
    pieceCid: CID,
    payloadCid: CID,
    filename: string,
    startBlock: number,
    endBlock: number,
  ) {
    this.deals = deals;
    this.pieceCid = pieceCid;
    this.payloadCid = payloadCid;
    this.filename = filename;
    this.startBlock = startBlock;
    this.endBlock = endBlock;
  }

  toJSON(): object {
    return {
      ...this,
      payloadCid: this.payloadCid.toString(),
      pieceCid: this.pieceCid.toString(),
    };
  }

  static parse(s: string): SubmissionReceipt {
    const parsed = SubmissionReceipt.SCHEMA.parse(JSON.parse(s));
    return new SubmissionReceipt(
      parsed.deals,
      parsed.pieceCid,
      parsed.payloadCid,
      parsed.filename,
      parsed.startBlock,
      parsed.endBlock,
    );
  }
}
