// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/// @dev Minimal mock for local tests — fulfills VRF requests manually.
contract MockVRFCoordinatorV2Plus {
    uint256 private _nextRequestId = 1;
    mapping(uint256 => address) public consumers;

    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata
    ) external returns (uint256 requestId) {
        requestId = _nextRequestId++;
        consumers[requestId] = msg.sender;
    }

    function fulfillRandomWords(uint256 requestId, uint256 randomWord) external {
        address consumer = consumers[requestId];
        require(consumer != address(0), "unknown request");

        uint256[] memory words = new uint256[](1);
        words[0] = randomWord;

        (bool ok, bytes memory err) = consumer.call(
            abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, words)
        );
        if (!ok) {
            assembly {
                revert(add(err, 32), mload(err))
            }
        }
    }
}
