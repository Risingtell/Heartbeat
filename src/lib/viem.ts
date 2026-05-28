import { createPublicClient, http } from "viem";
import { aeneid } from "./chain";

// Read-only client (no wallet needed) for receipts and contract reads.
export const publicClient = createPublicClient({ chain: aeneid, transport: http() });
