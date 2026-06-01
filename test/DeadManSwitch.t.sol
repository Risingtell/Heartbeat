// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {DeadManSwitch} from "../contracts/DeadManSwitch.sol";

/// Minimal cheatcode interface so this suite is self-contained (no forge-std
/// submodule required). Run with: `forge test`.
interface Vm {
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert() external;
}

contract DeadManSwitchTest {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    DeadManSwitch dms;

    address owner = address(0xA11CE);
    address heir = address(0xBEEF);
    address stranger = address(0xBAD);
    address g1 = address(0x6741);
    address g2 = address(0x6742);

    uint64 constant PERIOD = 120;
    uint64 constant CHALLENGE = 100;

    function setUp() public {
        dms = new DeadManSwitch();
        vm.warp(1_000_000); // start at a non-zero timestamp
    }

    // ---- helpers ----
    function _assert(bool cond, string memory what) internal pure {
        require(cond, what);
    }

    function _cd(address o, address h, uint64 p) internal pure returns (bytes memory) {
        return abi.encode(o, h, p);
    }

    function _configureOwner() internal {
        address[] memory none = new address[](0);
        vm.prank(owner);
        dms.configure(none, 0, 0);
    }

    // ---- tests ----

    function testTimeBasedRelease() public {
        _configureOwner();
        bytes memory cd = _cd(owner, heir, PERIOD);

        _assert(!dms.checkReadCondition(0, cd, "", heir), "heir blocked before expiry");
        _assert(!dms.isClaimable(owner, PERIOD), "not claimable before expiry");

        vm.warp(block.timestamp + PERIOD + 1);
        _assert(dms.checkReadCondition(0, cd, "", heir), "heir can read after expiry");
        _assert(dms.isClaimable(owner, PERIOD), "claimable after expiry");
    }

    function testHeartbeatResetsClock() public {
        _configureOwner();
        bytes memory cd = _cd(owner, heir, PERIOD);

        vm.warp(block.timestamp + PERIOD + 1);
        _assert(dms.checkReadCondition(0, cd, "", heir), "claimable after expiry");

        vm.prank(owner);
        dms.heartbeat();
        _assert(!dms.checkReadCondition(0, cd, "", heir), "heartbeat re-seals the vault");
    }

    function testNonHeirCannotRead() public {
        _configureOwner();
        bytes memory cd = _cd(owner, heir, PERIOD);
        vm.warp(block.timestamp + PERIOD + 1);

        _assert(dms.checkReadCondition(0, cd, "", heir), "heir allowed");
        _assert(!dms.checkReadCondition(0, cd, "", stranger), "stranger blocked even after expiry");
    }

    function testWriteOnlyOwner() public {
        bytes memory cd = _cd(owner, heir, PERIOD);
        _assert(dms.checkWriteCondition(0, cd, "", owner), "owner may write");
        _assert(!dms.checkWriteCondition(0, cd, "", heir), "heir may not write");
        _assert(!dms.checkWriteCondition(0, cd, "", stranger), "stranger may not write");
    }

    /// Security 3: a non-empty accessAuxData (arg-confusion / injection) must be rejected.
    function testAccessAuxInjectionRejected() public {
        // Attacker configures their OWN switch and expires it, so their tuple is "claimable".
        bytes memory victimCd = _cd(owner, heir, PERIOD);
        address[] memory none = new address[](0);
        vm.prank(stranger);
        dms.configure(none, 0, 0);
        vm.prank(stranger);
        dms.demoExpire();
        bytes memory attackerCd = _cd(stranger, stranger, PERIOD);

        // Make the victim's vault time-claimable too, to isolate the aux guard.
        _configureOwner();
        vm.warp(block.timestamp + PERIOD + 1);

        // Injecting attacker tuple as accessAuxData while reading the victim vault: rejected
        // because BOTH bytes args are non-empty.
        _assert(
            !dms.checkReadCondition(0, victimCd, attackerCd, stranger),
            "accessAux injection rejected"
        );
        // Sanity: the legitimate single-arg read still works for the real heir.
        _assert(dms.checkReadCondition(0, victimCd, "", heir), "legit heir read still works");
    }

    function testRejectsMalformedConditionData() public {
        _configureOwner();
        vm.warp(block.timestamp + PERIOD + 1);
        _assert(!dms.checkReadCondition(0, "", "", heir), "both-empty rejected");
        _assert(!dms.checkReadCondition(0, hex"1234", "", heir), "wrong-length rejected");
    }

    function testGuardianQuorumTripsAfterChallenge() public {
        address[] memory gs = new address[](2);
        gs[0] = g1;
        gs[1] = g2;
        vm.prank(owner);
        dms.configure(gs, 2, CHALLENGE);

        bytes memory cd = _cd(owner, heir, PERIOD); // long period: time release won't fire

        vm.prank(g1);
        dms.attestInactive(owner);
        vm.prank(g2);
        dms.attestInactive(owner);

        // Tripped, but challenge window not yet elapsed.
        _assert(!dms.checkReadCondition(0, cd, "", heir), "blocked during challenge window");

        vm.warp(block.timestamp + CHALLENGE + 1);
        _assert(dms.checkReadCondition(0, cd, "", heir), "released after challenge window");
    }

    function testHeartbeatCancelsGuardianTrip() public {
        address[] memory gs = new address[](2);
        gs[0] = g1;
        gs[1] = g2;
        vm.prank(owner);
        dms.configure(gs, 2, CHALLENGE);
        bytes memory cd = _cd(owner, heir, PERIOD);

        vm.prank(g1);
        dms.attestInactive(owner);
        vm.prank(g2);
        dms.attestInactive(owner);

        vm.prank(owner);
        dms.heartbeat(); // cancels the trip and invalidates the attestation cycle

        vm.warp(block.timestamp + CHALLENGE + 1);
        _assert(!dms.checkReadCondition(0, cd, "", heir), "trip cancelled by heartbeat");
    }

    /// Bug 2: reconfiguring must be able to REMOVE a guardian.
    function testGuardianRemovalOnReconfigure() public {
        address[] memory gs = new address[](2);
        gs[0] = g1;
        gs[1] = g2;
        vm.prank(owner);
        dms.configure(gs, 1, CHALLENGE);
        _assert(dms.isGuardian(owner, g1), "g1 is a guardian");

        address[] memory gs2 = new address[](1);
        gs2[0] = g2;
        vm.prank(owner);
        dms.configure(gs2, 1, CHALLENGE);

        _assert(!dms.isGuardian(owner, g1), "g1 removed after reconfigure");
        _assert(dms.isGuardian(owner, g2), "g2 still a guardian");

        // Removed guardian can no longer attest.
        vm.prank(g1);
        vm.expectRevert();
        dms.attestInactive(owner);
    }

    /// Bug 1: two vaults from one owner are independent (different heir + window).
    function testPerVaultIndependence() public {
        _configureOwner();
        bytes memory vaultShort = _cd(owner, heir, 60);
        bytes memory vaultLong = _cd(owner, stranger, 10_000);

        vm.warp(block.timestamp + 61);
        _assert(dms.checkReadCondition(0, vaultShort, "", heir), "short vault released");
        _assert(!dms.checkReadCondition(0, vaultLong, "", stranger), "long vault still sealed");
    }

    function testInactiveOwnerNeverClaimable() public {
        // No configure() => switch inactive.
        bytes memory cd = _cd(owner, heir, PERIOD);
        vm.warp(block.timestamp + PERIOD + 1);
        _assert(!dms.checkReadCondition(0, cd, "", heir), "inactive owner not claimable");
        _assert(!dms.isClaimable(owner, PERIOD), "inactive owner isClaimable false");
    }
}
