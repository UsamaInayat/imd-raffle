// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/// @title IdentityMDRaffle
/// @notice Holder-gated on-chain raffles with Chainlink VRF v2.5 randomness.
/// @dev Split finalize: requestDraw snapshots eligible holders, VRF callback stores seed only,
///      finalizeDraw picks winners in a separate ETH transaction (minimal LINK cost).
contract IdentityMDRaffle is VRFConsumerBaseV2Plus, ReentrancyGuard {
    IERC721 public immutable identityMD;

    uint256 public constant MAX_WINNERS = 256;
    uint256 public constant MAX_TITLE_LENGTH = 128;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 512;

    enum RaffleStatus {
        Open,
        DrawRequested,
        SeedReady,
        Closed,
        Cancelled
    }

    struct Raffle {
        string title;
        string description;
        uint64 endsAt;
        uint32 winnerCount;
        RaffleStatus status;
        uint256 vrfRequestId;
        uint256 randomSeed;
        address[] winners;
    }

    struct VrfConfig {
        bytes32 keyHash;
        uint256 subscriptionId;
        uint32 callbackGasLimit;
        uint16 requestConfirmations;
        bool nativePayment;
    }

    uint256 public nextRaffleId;
    VrfConfig public vrfConfig;

    mapping(uint256 => Raffle) private _raffles;
    mapping(uint256 => address[]) private _entries;
    mapping(uint256 => address[]) private _eligibleEntriesAtDraw;
    mapping(uint256 => mapping(address => bool)) public hasEntered;
    mapping(address => bool) public admins;
    mapping(uint256 => uint256) public requestIdToRaffleId;

    event RaffleCreated(
        uint256 indexed raffleId,
        string title,
        uint256 winnerCount,
        uint256 endsAt,
        address indexed creator
    );
    event RaffleEntered(uint256 indexed raffleId, address indexed participant);
    event DrawRequested(uint256 indexed raffleId, uint256 indexed vrfRequestId);
    event DrawSeedReceived(uint256 indexed raffleId, uint256 randomSeed);
    event RaffleFinalized(
        uint256 indexed raffleId,
        uint256 randomSeed,
        uint256 winnerCount,
        uint256 eligibleCount
    );
    event RaffleCancelled(uint256 indexed raffleId, address indexed cancelledBy);
    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);
    event VrfConfigUpdated(bytes32 keyHash, uint256 subscriptionId, uint32 callbackGasLimit);

    error RaffleNotFound();
    error RaffleNotOpen();
    error RaffleStillOpen();
    error DrawAlreadyRequested();
    error SeedNotReady();
    error NotIdentityMDHolder();
    error NotAdmin();
    error AlreadyEntered();
    error InvalidWinnerCount();
    error InvalidEndTime();
    error NoEntries();
    error InvalidZeroAddress();
    error InvalidVrfConfig();
    error CannotRemoveOwner();
    error RaffleNotCancellable();
    error TitleTooLong();
    error DescriptionTooLong();

    constructor(
        address identityMD_,
        address vrfCoordinator_,
        address initialOwner,
        VrfConfig memory vrfConfig_
    ) VRFConsumerBaseV2Plus(vrfCoordinator_) {
        if (identityMD_ == address(0) || vrfCoordinator_ == address(0) || initialOwner == address(0)) {
            revert InvalidZeroAddress();
        }
        if (vrfConfig_.subscriptionId == 0 || vrfConfig_.keyHash == bytes32(0)) {
            revert InvalidVrfConfig();
        }
        identityMD = IERC721(identityMD_);
        vrfConfig = vrfConfig_;
        admins[initialOwner] = true;
    }

    function isAdmin(address account) public view returns (bool) {
        return admins[account] || account == owner();
    }

    function addAdmin(address account) external onlyOwner {
        if (account == address(0)) revert InvalidZeroAddress();
        admins[account] = true;
        emit AdminAdded(account, msg.sender);
    }

    function removeAdmin(address account) external onlyOwner {
        if (account == owner()) revert CannotRemoveOwner();
        admins[account] = false;
        emit AdminRemoved(account, msg.sender);
    }

    modifier onlyAdmin() {
        if (!isAdmin(msg.sender)) revert NotAdmin();
        _;
    }

    function setVrfConfig(VrfConfig calldata config) external onlyOwner {
        if (config.subscriptionId == 0 || config.keyHash == bytes32(0)) revert InvalidVrfConfig();
        vrfConfig = config;
        emit VrfConfigUpdated(config.keyHash, config.subscriptionId, config.callbackGasLimit);
    }

    function createRaffle(
        string calldata title,
        string calldata description,
        uint256 winnerCount,
        uint256 endsAt
    ) external onlyAdmin returns (uint256 raffleId) {
        if (winnerCount == 0 || winnerCount > MAX_WINNERS) revert InvalidWinnerCount();
        if (endsAt <= block.timestamp) revert InvalidEndTime();
        if (bytes(title).length > MAX_TITLE_LENGTH) revert TitleTooLong();
        if (bytes(description).length > MAX_DESCRIPTION_LENGTH) revert DescriptionTooLong();

        raffleId = nextRaffleId++;
        Raffle storage raffle = _raffles[raffleId];
        raffle.title = title;
        raffle.description = description;
        raffle.winnerCount = uint32(winnerCount);
        raffle.endsAt = uint64(endsAt);
        raffle.status = RaffleStatus.Open;

        emit RaffleCreated(raffleId, title, winnerCount, endsAt, msg.sender);
    }

    function cancelRaffle(uint256 raffleId) external onlyAdmin {
        Raffle storage raffle = _requireRaffle(raffleId);
        if (raffle.status != RaffleStatus.Open) revert RaffleNotCancellable();
        raffle.status = RaffleStatus.Cancelled;
        emit RaffleCancelled(raffleId, msg.sender);
    }

    function enter(uint256 raffleId) external nonReentrant {
        Raffle storage raffle = _requireRaffle(raffleId);
        if (raffle.status != RaffleStatus.Open) revert RaffleNotOpen();
        if (block.timestamp >= raffle.endsAt) revert RaffleNotOpen();
        if (hasEntered[raffleId][msg.sender]) revert AlreadyEntered();
        if (identityMD.balanceOf(msg.sender) == 0) revert NotIdentityMDHolder();

        hasEntered[raffleId][msg.sender] = true;
        _entries[raffleId].push(msg.sender);

        emit RaffleEntered(raffleId, msg.sender);
    }

    /// @notice Snapshots eligible holders (2nd IDMD check), then requests VRF randomness.
    function requestDraw(uint256 raffleId) external {
        Raffle storage raffle = _requireRaffle(raffleId);
        if (raffle.status != RaffleStatus.Open) revert DrawAlreadyRequested();
        if (block.timestamp < raffle.endsAt) revert RaffleStillOpen();
        if (_entries[raffleId].length == 0) revert NoEntries();

        address[] memory eligible = _snapshotEligibleEntries(raffleId);
        uint256 eligibleCount = eligible.length;

        if (eligibleCount == 0) {
            raffle.status = RaffleStatus.Closed;
            emit RaffleFinalized(raffleId, 0, 0, 0);
            return;
        }

        raffle.status = RaffleStatus.DrawRequested;

        VrfConfig memory cfg = vrfConfig;
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: cfg.keyHash,
                subId: cfg.subscriptionId,
                requestConfirmations: cfg.requestConfirmations,
                callbackGasLimit: cfg.callbackGasLimit,
                numWords: 1,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: cfg.nativePayment})
                )
            })
        );

        raffle.vrfRequestId = requestId;
        requestIdToRaffleId[requestId] = raffleId;

        emit DrawRequested(raffleId, requestId);
    }

    /// @dev VRF callback — stores seed only. Winner selection runs in finalizeDraw().
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        uint256 raffleId = requestIdToRaffleId[requestId];
        Raffle storage raffle = _requireRaffle(raffleId);
        if (raffle.status != RaffleStatus.DrawRequested) return;

        raffle.randomSeed = randomWords[0];
        raffle.status = RaffleStatus.SeedReady;

        emit DrawSeedReceived(raffleId, randomWords[0]);
    }

    /// @notice Picks winners from the snapshotted eligible list and stored VRF seed.
    function finalizeDraw(uint256 raffleId) external {
        Raffle storage raffle = _requireRaffle(raffleId);
        if (raffle.status != RaffleStatus.SeedReady) revert SeedNotReady();

        address[] memory eligible = _eligibleEntriesAtDraw[raffleId];
        uint256 eligibleCount = eligible.length;
        if (eligibleCount == 0) {
            raffle.status = RaffleStatus.Closed;
            emit RaffleFinalized(raffleId, raffle.randomSeed, 0, 0);
            return;
        }

        uint256 winnerCount = raffle.winnerCount;
        if (winnerCount > eligibleCount) {
            winnerCount = eligibleCount;
        }

        address[] memory winners = pickWinners(raffle.randomSeed, eligible, winnerCount);

        raffle.winners = winners;
        raffle.status = RaffleStatus.Closed;

        emit RaffleFinalized(raffleId, raffle.randomSeed, winnerCount, eligibleCount);
    }

    function getRaffleCount() external view returns (uint256) {
        return nextRaffleId;
    }

    function getRaffle(
        uint256 raffleId
    )
        external
        view
        returns (
            string memory title,
            string memory description,
            uint256 winnerCount,
            uint256 endsAt,
            RaffleStatus status,
            uint256 vrfRequestId,
            uint256 randomSeed,
            address[] memory winners
        )
    {
        Raffle storage raffle = _requireRaffle(raffleId);
        return (
            raffle.title,
            raffle.description,
            raffle.winnerCount,
            raffle.endsAt,
            raffle.status,
            raffle.vrfRequestId,
            raffle.randomSeed,
            raffle.winners
        );
    }

    function getEntries(uint256 raffleId) external view returns (address[] memory) {
        _requireRaffle(raffleId);
        return _entries[raffleId];
    }

    function getEligibleEntriesAtDraw(
        uint256 raffleId
    ) external view returns (address[] memory) {
        _requireRaffle(raffleId);
        return _eligibleEntriesAtDraw[raffleId];
    }

    function getEntryCount(uint256 raffleId) external view returns (uint256) {
        _requireRaffle(raffleId);
        return _entries[raffleId].length;
    }

    function isIdentityMDHolder(address account) external view returns (bool) {
        return identityMD.balanceOf(account) > 0;
    }

    function previewEligibleEntries(
        uint256 raffleId
    ) external view returns (address[] memory) {
        _requireRaffle(raffleId);
        return _filterEligibleEntriesView(_entries[raffleId]);
    }

    function pickWinners(
        uint256 seed,
        address[] memory entries,
        uint256 winnerCount
    ) public pure returns (address[] memory winners) {
        uint256 entryCount = entries.length;
        if (entryCount == 0 || winnerCount == 0) {
            return new address[](0);
        }
        if (winnerCount > entryCount) {
            winnerCount = entryCount;
        }

        winners = new address[](winnerCount);
        uint256 remaining = entryCount;
        uint256 currentSeed = seed;

        for (uint256 w = 0; w < winnerCount; ) {
            (uint256 index, uint256 nextSeed) = _boundedRandom(currentSeed, remaining);
            currentSeed = nextSeed;
            winners[w] = entries[index];
            entries[index] = entries[remaining - 1];
            unchecked {
                --remaining;
                ++w;
            }
        }
    }

    function verifyWinners(
        uint256 raffleId
    )
        external
        view
        returns (bool valid, address[] memory recomputed, address[] memory stored)
    {
        Raffle storage raffle = _requireRaffle(raffleId);
        if (raffle.status != RaffleStatus.Closed) {
            return (false, new address[](0), raffle.winners);
        }

        stored = raffle.winners;
        if (stored.length == 0) {
            return (true, new address[](0), stored);
        }

        address[] memory eligible = _eligibleEntriesAtDraw[raffleId];
        uint256 winnerCount = raffle.winnerCount;
        if (winnerCount > eligible.length) {
            winnerCount = eligible.length;
        }

        recomputed = pickWinners(raffle.randomSeed, eligible, winnerCount);

        if (recomputed.length != stored.length) {
            return (false, recomputed, stored);
        }

        for (uint256 i = 0; i < stored.length; ) {
            if (recomputed[i] != stored[i]) {
                return (false, recomputed, stored);
            }
            unchecked {
                ++i;
            }
        }

        return (true, recomputed, stored);
    }

    function _snapshotEligibleEntries(
        uint256 raffleId
    ) internal returns (address[] memory eligible) {
        address[] storage entries = _entries[raffleId];
        uint256 len = entries.length;

        eligible = new address[](len);
        uint256 count;
        for (uint256 i = 0; i < len; ) {
            address entry = entries[i];
            if (identityMD.balanceOf(entry) > 0) {
                eligible[count] = entry;
                unchecked {
                    ++count;
                }
            }
            unchecked {
                ++i;
            }
        }

        assembly {
            mstore(eligible, count)
        }

        _eligibleEntriesAtDraw[raffleId] = eligible;
    }

    function _filterEligibleEntriesView(
        address[] storage entries
    ) internal view returns (address[] memory eligible) {
        uint256 len = entries.length;

        eligible = new address[](len);
        uint256 count;
        for (uint256 i = 0; i < len; ) {
            address entry = entries[i];
            if (identityMD.balanceOf(entry) > 0) {
                eligible[count] = entry;
                unchecked {
                    ++count;
                }
            }
            unchecked {
                ++i;
            }
        }

        assembly {
            mstore(eligible, count)
        }
    }

    function _boundedRandom(
        uint256 seed,
        uint256 bound
    ) internal pure returns (uint256 index, uint256 nextSeed) {
        nextSeed = uint256(keccak256(abi.encodePacked(seed)));
        index = nextSeed % bound;
    }

    function _requireRaffle(uint256 raffleId) internal view returns (Raffle storage) {
        if (raffleId >= nextRaffleId) revert RaffleNotFound();
        return _raffles[raffleId];
    }
}
