// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title DeadManSwitch
/// @notice A CDR condition contract implementing proof-of-life gated decryption.
///         An owner encrypts a secret into a CDR vault whose read condition points
///         here. The owner must periodically `heartbeat()`. If they go inactive past
///         their configured period -- OR a quorum of guardians attests and a challenge
///         window elapses -- the designated heir becomes able to decrypt the vault.
///
///         The same contract serves as both the write gate (only the owner may write)
///         and the read gate (only the heir, only once the switch has tripped).
///
/// @dev    CDR calls `checkWriteCondition` / `checkReadCondition` with the original
///         caller, the per-vault `conditionData` (here: abi.encode(owner)), and
///         read-time `accessAuxData` (unused). Both are `view`; mutating actions
///         (configure / heartbeat / attest) are separate transactions.
contract DeadManSwitch {
    struct Switch {
        address heir;            // who may claim once tripped
        uint64 period;           // inactivity seconds before time-based release
        uint64 lastPing;         // last proof-of-life timestamp
        uint64 challengeWindow;  // grace seconds after a guardian trip, owner can cancel
        uint64 triggeredAt;      // timestamp guardians reached threshold (0 = not tripped)
        uint32 guardianThreshold;// guardian attestations required (0 = guardians disabled)
        uint32 attestations;     // attestations in the current cycle
        uint64 cycle;            // bumped on every heartbeat to invalidate stale attestations
        bool active;             // false until configured / after revoke
    }

    mapping(address => Switch) private _switches;                 // owner => switch
    mapping(address => mapping(address => bool)) public isGuardian; // owner => guardian => enabled
    mapping(bytes32 => bool) private _attested;                   // keccak(owner,guardian,cycle) => attested

    event Configured(address indexed owner, address indexed heir, uint64 period, uint32 guardianThreshold);
    event Heartbeat(address indexed owner, uint64 at);
    event GuardianAttested(address indexed owner, address indexed guardian, uint32 attestations);
    event Tripped(address indexed owner, uint64 at);
    event Revoked(address indexed owner);

    // --------------------------------------------------------------------- //
    // Owner setup                                                           //
    // --------------------------------------------------------------------- //

    /// @notice Create or update the caller's switch. Resets the proof-of-life clock.
    function configure(
        address heir,
        uint64 period,
        address[] calldata guardians,
        uint32 guardianThreshold,
        uint64 challengeWindow
    ) external {
        require(heir != address(0) && heir != msg.sender, "bad heir");
        require(period > 0, "bad period");
        require(guardianThreshold <= guardians.length, "threshold>guardians");

        Switch storage s = _switches[msg.sender];
        s.heir = heir;
        s.period = period;
        s.lastPing = uint64(block.timestamp);
        s.challengeWindow = challengeWindow;
        s.guardianThreshold = guardianThreshold;
        s.triggeredAt = 0;
        s.attestations = 0;
        s.cycle += 1; // invalidate any prior-cycle attestations
        s.active = true;

        for (uint256 i = 0; i < guardians.length; i++) {
            isGuardian[msg.sender][guardians[i]] = true;
        }
        emit Configured(msg.sender, heir, period, guardianThreshold);
    }

    /// @notice Proof of life. Resets the inactivity clock and cancels any guardian trip.
    function heartbeat() external {
        Switch storage s = _switches[msg.sender];
        require(s.active, "not configured");
        s.lastPing = uint64(block.timestamp);
        s.triggeredAt = 0;
        s.attestations = 0;
        s.cycle += 1;
        emit Heartbeat(msg.sender, uint64(block.timestamp));
    }

    /// @notice Permanently deactivate the caller's switch.
    function revoke() external {
        Switch storage s = _switches[msg.sender];
        require(s.active, "not configured");
        s.active = false;
        emit Revoked(msg.sender);
    }

    /// @notice DEMO ONLY: owner fast-forwards their own clock so the vault is
    ///         immediately claimable, for live demonstrations. Self-only, harmless.
    function demoExpire() external {
        Switch storage s = _switches[msg.sender];
        require(s.active, "not configured");
        s.lastPing = uint64(block.timestamp) - s.period - 1;
        emit Tripped(msg.sender, uint64(block.timestamp));
    }

    // --------------------------------------------------------------------- //
    // Guardian flow (multi-sig override)                                    //
    // --------------------------------------------------------------------- //

    /// @notice A configured guardian attests the owner is inactive. Once the
    ///         threshold is reached the challenge window starts ticking.
    function attestInactive(address owner) external {
        require(isGuardian[owner][msg.sender], "not guardian");
        Switch storage s = _switches[owner];
        require(s.active, "not configured");
        require(s.guardianThreshold > 0, "guardians disabled");

        bytes32 key = keccak256(abi.encodePacked(owner, msg.sender, s.cycle));
        require(!_attested[key], "already attested");
        _attested[key] = true;
        s.attestations += 1;
        emit GuardianAttested(owner, msg.sender, s.attestations);

        if (s.attestations >= s.guardianThreshold && s.triggeredAt == 0) {
            s.triggeredAt = uint64(block.timestamp);
            emit Tripped(owner, uint64(block.timestamp));
        }
    }

    // --------------------------------------------------------------------- //
    // CDR condition interface                                               //
    // --------------------------------------------------------------------- //

    /// @dev The CDR core invokes conditions as
    ///      check{Read,Write}Condition(uint32 uuid, bytes, bytes, address caller).
    ///      The two `bytes` args are the stored conditionData and the call-time
    ///      accessAuxData; their positional order is not distinguishable from the
    ///      selector. In this design accessAuxData is always empty, so we read the
    ///      owner from whichever arg carries the 32-byte payload.
    function _owner(bytes calldata a, bytes calldata b) private pure returns (bool ok, address owner) {
        if (a.length >= 32) return (true, abi.decode(a, (address)));
        if (b.length >= 32) return (true, abi.decode(b, (address)));
        return (false, address(0));
    }

    /// @notice Write gate: only the owner encoded in conditionData may write.
    function checkWriteCondition(uint32, bytes calldata a, bytes calldata b, address caller)
        external
        pure
        returns (bool)
    {
        (bool ok, address owner) = _owner(a, b);
        return ok && caller == owner;
    }

    /// @notice Read gate: only the heir, and only once the switch has tripped.
    function checkReadCondition(uint32, bytes calldata a, bytes calldata b, address caller)
        external
        view
        returns (bool)
    {
        (bool ok, address owner) = _owner(a, b);
        if (!ok) return false;
        Switch storage s = _switches[owner];
        if (!s.active || caller != s.heir) return false;
        return _isClaimable(s);
    }

    // --------------------------------------------------------------------- //
    // Views (for UI + composability)                                        //
    // --------------------------------------------------------------------- //

    function _isClaimable(Switch storage s) internal view returns (bool) {
        bool timeElapsed = block.timestamp >= uint256(s.lastPing) + s.period;
        bool guardianTripped = s.guardianThreshold > 0 &&
            s.triggeredAt != 0 &&
            block.timestamp >= uint256(s.triggeredAt) + s.challengeWindow;
        return timeElapsed || guardianTripped;
    }

    /// @notice Whether `owner`'s vault is currently claimable by the heir.
    function isClaimable(address owner) external view returns (bool) {
        Switch storage s = _switches[owner];
        if (!s.active) return false;
        return _isClaimable(s);
    }

    /// @notice Seconds until time-based release (0 if already claimable / inactive).
    function secondsUntilClaimable(address owner) external view returns (uint256) {
        Switch storage s = _switches[owner];
        if (!s.active) return 0;
        uint256 releaseAt = uint256(s.lastPing) + s.period;
        if (block.timestamp >= releaseAt) return 0;
        return releaseAt - block.timestamp;
    }

    /// @notice Full switch state for an owner (for dashboards / heir views).
    function getSwitch(address owner)
        external
        view
        returns (
            address heir,
            uint64 period,
            uint64 lastPing,
            uint64 challengeWindow,
            uint64 triggeredAt,
            uint32 guardianThreshold,
            uint32 attestations,
            bool active,
            bool claimable
        )
    {
        Switch storage s = _switches[owner];
        return (
            s.heir,
            s.period,
            s.lastPing,
            s.challengeWindow,
            s.triggeredAt,
            s.guardianThreshold,
            s.attestations,
            s.active,
            s.active && _isClaimable(s)
        );
    }
}
