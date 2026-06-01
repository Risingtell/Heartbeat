// DeadManSwitch deployed on Story Aeneid (keep in sync with deployments.json)
export const DEAD_MAN_SWITCH =
  "0x288fc0953f2fb44230449ddc34ef6d3c539b6843" as const;

export const deadManSwitchAbi = [
  {
    type: "function",
    name: "configure",
    stateMutability: "nonpayable",
    inputs: [
      { name: "guardians", type: "address[]" },
      { name: "guardianThreshold", type: "uint32" },
      { name: "challengeWindow", type: "uint64" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "heartbeat",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "revoke",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "demoExpire",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "attestInactive",
    stateMutability: "nonpayable",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isGuardian",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "guardian", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "isClaimable",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "period", type: "uint64" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "secondsUntilClaimable",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "period", type: "uint64" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getClock",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [
      { name: "lastPing", type: "uint64" },
      { name: "challengeWindow", type: "uint64" },
      { name: "triggeredAt", type: "uint64" },
      { name: "guardianThreshold", type: "uint32" },
      { name: "attestations", type: "uint32" },
      { name: "active", type: "bool" },
      { name: "guardianTripped", type: "bool" },
    ],
  },
] as const;
