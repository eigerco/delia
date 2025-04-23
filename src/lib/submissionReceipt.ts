import { CID } from "multiformats/cid";
import { z } from "zod";

const DAG_PB_CODEC = 0x70;
const FIL_COMMITMENT_UNSEALED_CODEC = 0xf101;

namespace DealResult {
  export const schema = z.object({
    storageProviderPeerId: z.string(),
    storageProviderAccountId: z.string(),
    dealId: z.number(),
  });
}

type DealResult = {
  storageProviderPeerId: string;
  storageProviderAccountId: string;
  dealId: number;
};

// This gives us better errors for missing fields
const errorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type && issue.received === "undefined") {
    return { message: `Missing required field: ${issue.path.join(".")}` };
  }
  return { message: ctx.defaultError };
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
        // We know `e` is at least an object — i.e. not undefined nor null
        message: (e as object).toString(),
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
    pieceCid: cidSchema.refine((cid) => cid.code === FIL_COMMITMENT_UNSEALED_CODEC, {
      message: `Piece CID must be equal to ${FIL_COMMITMENT_UNSEALED_CODEC}`,
    }),
    payloadCid: cidSchema.refine((cid) => cid.code === DAG_PB_CODEC, {
      message: `Payload CID must be equal to ${DAG_PB_CODEC}`,
    }),
    filename: z.string(),
    startBlock: z.number(),
    endBlock: z.number(),
  });

  private constructor(
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

  static new(params: {
    deals: DealResult[];
    pieceCid: string;
    payloadCid: string;
    filename: string;
    startBlock: number;
    endBlock: number;
  }): SubmissionReceipt {
    const parsed = SubmissionReceipt.SCHEMA.parse(params, { errorMap });
    return new SubmissionReceipt(
      parsed.deals,
      parsed.pieceCid,
      parsed.payloadCid,
      parsed.filename,
      parsed.startBlock,
      parsed.endBlock,
    );
  }

  toJSON(): object {
    return {
      ...this,
      payloadCid: this.payloadCid.toString(),
      pieceCid: this.pieceCid.toString(),
    };
  }
}
