// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Smoke-test condition contract: always permits read and write.
/// Used only to validate the CDR encrypt -> store -> decrypt pipeline.
/// NOT for production.
contract AlwaysAllow {
    function checkReadCondition(address, bytes calldata, bytes calldata)
        external
        pure
        returns (bool)
    {
        return true;
    }

    function checkWriteCondition(address, bytes calldata, bytes calldata)
        external
        pure
        returns (bool)
    {
        return true;
    }
}
