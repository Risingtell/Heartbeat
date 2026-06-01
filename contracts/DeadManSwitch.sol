// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title DeadManSwitch
/// @notice A CDR condition contract implementing proof-of-life gated decryption.
///         Each vault binds its own `(owner, heir, period)` into the CDR
///         `conditionData`, so one owner can seal many vaults to different heirs
///         with different inactivity windows. The owner keeps a single proof-of-life
///         clock; a `heartbeat()` covers every vault. If the owner goes silent past a
///         vault's `period` -- OR a quorum of guardians attests and a challenge window
///         elapses -- that vault's heir becomes able to decrypt it.
///
///         The same contract is both the write gate (only the owner may write) and the
///         read gate (only the heir, only once the switch has tripped for that vault).
///
/// @dev    On the live Aeneid deployment the CDR core invokes conditions as
///         `check{Read,Write}Condition(uint32 uuid, bytes, bytes, address caller)`
///         -- selectors 0x8db3eb17 / 0x5645dbbf, matching the deployed
///         LicenseReadCondition / OwnerWriteCondition. (Story's published docs show a
///         3-arg `(address caller, bytes, bytes)` shape; that is stale relative to what
///         is actually deployed.) `conditionData` is stored immutably at allocation;
///         `accessAuxData` is supplied by the caller at access time. This design never
///         uses `accessAuxData`, so the gate decodes the vault tuple from the single
///         non-empty `bytes` arg and REJECTS any access that supplies a non-empty
///         `accessAuxData` -- which closes the argument-confusion vector (a caller
///         cannot smuggle in an attacker-controlled owner via `accessAuxData`).
contract DeadManSwitch {
    struct Switch {
        uint64 lastPing;          // last proof-of-life timestamp
        uint64 challengeWindow;   // grace seconds after a guardian trip, owner can cancel
        uint64 triggeredAt;       // timestamp guardians reached threshold (0 = not tripped)
        uint32 guardianThreshold; // guardian attestations required (0 = guardians disabled)
        uint32 attestations;      // attestations in the current cycle
        uint64 cycle;             // bumped on heartbeat/configure to invalidate stale attestations
        bool active;              // false until configured / after revoke
    }

    mapping(address => Switch) private _switches;                   // owner => clock
    mapping(address => mapping(address => bool)) public isGuardian; // owner => guardian => enabled
    mapping(address => address[]) private _guardians;               // owner => guardian list (for clean removal)
    mapping(bytes32 => bool) private _attested;                     // keccak(owner,guardian,cycle) => attested

    event Configured(address indexed owner, uint32 guardianThreshold, uint64 challengeWindow);
    event Heartbeat(address indexed owner, uint64 at);
    event GuardianAttested(address indexed owner, address indexed guardian, uint32 attestations);
    event Tripped(address indexed owner, uint64 at);
    event Revoked(address indexed owner);

    // --------------------------------------------------------------------- //
    // Owner setup                                                           //
    // --------------------------------------------------------------------- //

    /// @notice Create or update the caller's proof-of-life clock and guardian set.
    ///         Resets the clock. The heir and inactivity window are per-vault (carried
    ///         in each vault's conditionData), not set here.
    function configure(
        address[] calldata guardians,
        uint32 guardianThreshold,
        uint64 challengeWindow
    ) external {
        require(guardianThreshold <= guardians.length, "threshold>guardians");

        // Clear the previous guardian set first, so reconfiguring can REMOVE guardians.
        address[] storage prev = _guardians[msg.sender];
        for (uint256 i = 0; i < prev.length; i++) {
            isGuardian[msg.sender][prev[i]] = false;
        }
        delete _guardians[msg.sender];

        for (uint256 i = 0; i < guardians.length; i++) {
            if (!isGuardian[msg.sender][guardians[i]]) {
                isGuardian[msg.sender][guardians[i]] = true;
                _guardians[msg.sender].push(guardians[i]);
            }
        }

        Switch storage s = _switches[msg.sender];
        s.lastPing = uint64(block.timestamp);
        s.challengeWindow = challengeWindow;
        s.guardianThreshold = guardianThreshold;
        s.triggeredAt = 0;
        s.attestations = 0;
        s.cycle += 1; // invalidate any prior-cycle attestations
        s.active = true;
        emit Configured(msg.sender, guardianThreshold, challengeWindow);
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

    /// @notice DEMO ONLY: owner fast-forwards their own clock so every vault they own
    ///         is immediately claimable, for live demonstrations. Self-only, harmless.
    ///         Remove before any production deployment.
    function demoExpire() external {
        Switch storage s = _switches[msg.sender];
        require(s.active, "not configured");
        s.lastPing = 0; // now >= 0 + period holds for any vault period
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

    /// @dev Decode `(owner, heir, period)` from the single non-empty `bytes` arg
    ///      (the stored conditionData). Returns ok=false if BOTH args are non-empty
    ///      (the caller supplied accessAuxData -> reject) or neither is the expected
    ///      96-byte tuple. See the contract-level note on the CDR call shape.
    function _vault(bytes calldata a, bytes calldata b)
        private
        pure
        returns (bool ok, address owner, address heir, uint64 period)
    {
        bytes calldata cd;
        if (a.length > 0 && b.length == 0) cd = a;
        else if (b.length > 0 && a.length == 0) cd = b;
        else return (false, address(0), address(0), 0); // both empty or both set -> reject
        if (cd.length != 96) return (false, address(0), address(0), 0);
        (owner, heir, period) = abi.decode(cd, (address, address, uint64));
        ok = true;
    }

    /// @notice Write gate: only the owner encoded in conditionData may write.
    function checkWriteCondition(uint32, bytes calldata a, bytes calldata b, address caller)
        external
        pure
        returns (bool)
    {
        (bool ok, address owner,,) = _vault(a, b);
        return ok && caller == owner;
    }

    /// @notice Read gate: only this vault's heir, and only once its switch has tripped.
    function checkReadCondition(uint32, bytes calldata a, bytes calldata b, address caller)
        external
        view
        returns (bool)
    {
        (bool ok, address owner, address heir, uint64 period) = _vault(a, b);
        if (!ok) return false;
        Switch storage s = _switches[owner];
        if (!s.active || caller != heir) return false;
        return _isClaimable(s, period);
    }

    // --------------------------------------------------------------------- //
    // Views (for UI + composability)                                        //
    // --------------------------------------------------------------------- //

    function _isClaimable(Switch storage s, uint64 period) internal view returns (bool) {
        bool timeElapsed = block.timestamp >= uint256(s.lastPing) + period;
        bool guardianTripped = s.guardianThreshold > 0 &&
            s.triggeredAt != 0 &&
            block.timestamp >= uint256(s.triggeredAt) + s.challengeWindow;
        return timeElapsed || guardianTripped;
    }

    /// @notice Whether a vault with this `period` is currently claimable by its heir.
    function isClaimable(address owner, uint64 period) external view returns (bool) {
        Switch storage s = _switches[owner];
        if (!s.active) return false;
        return _isClaimable(s, period);
    }

    /// @notice Seconds until time-based release for a vault with this `period`
    ///         (0 if already elapsed / owner inactive). Guardian trips can release earlier.
    function secondsUntilClaimable(address owner, uint64 period) external view returns (uint256) {
        Switch storage s = _switches[owner];
        if (!s.active) return 0;
        uint256 releaseAt = uint256(s.lastPing) + period;
        if (block.timestamp >= releaseAt) return 0;
        return releaseAt - block.timestamp;
    }

    /// @notice The owner's proof-of-life clock + guardian state (for dashboards / heir views).
    function getClock(address owner)
        external
        view
        returns (
            uint64 lastPing,
            uint64 challengeWindow,
            uint64 triggeredAt,
            uint32 guardianThreshold,
            uint32 attestations,
            bool active,
            bool guardianTripped
        )
    {
        Switch storage s = _switches[owner];
        bool gt = s.guardianThreshold > 0 &&
            s.triggeredAt != 0 &&
            block.timestamp >= uint256(s.triggeredAt) + s.challengeWindow;
        return (
            s.lastPing,
            s.challengeWindow,
            s.triggeredAt,
            s.guardianThreshold,
            s.attestations,
            s.active,
            gt
        );
    }
}
