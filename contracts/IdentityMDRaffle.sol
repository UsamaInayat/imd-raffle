// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title IdentityMDRaffle
/// @notice Holder-gated on-chain raffles for Identity MD (IDMD) collectors.
/// @dev Admins create timed raffles. Holders enter via signed tx. After close,
///      anyone requests a draw; after DRAW_DELAY_BLOCKS anyone finalizes using
///      prevrandao + blockhash randomness. Only wallets still holding IDMD at
///      finalize time are eligible to win. Winners are verifiable via pickWinners().
contract IdentityMDRaffle is Ownable, ReentrancyGuard {
    IERC721 public immutable identityMD;

    enum RaffleStatus {
        Open,
        DrawRequested,
        Closed
    }

    struct Raffle {
        string title;
        string description;
        uint256 winnerCount;
        uint256 endsAt;
        RaffleStatus status;
        uint256 drawRequestedAt;
        uint256 randomSeed;
        address[] winners;
    }

    uint256 public nextRaffleId;
    mapping(uint256 => Raffle) private _raffles;
    mapping(uint256 => address[]) private _entries;
    mapping(uint256 => address[]) private _eligibleEntriesAtDraw;
    mapping(uint256 => mapping(address => bool)) public hasEntered;
    mapping(address => bool) public admins;

    event RaffleCreated(
        uint256 indexed raffleId,
        string title,
        uint256 winnerCount,
        uint256 endsAt,
        address indexed creator
    );
    event RaffleEntered(uint256 indexed raffleId, address indexed participant);
    event DrawRequested(uint256 indexed raffleId, uint256 drawBlock);
    event RaffleFinalized(
        uint256 indexed raffleId,
        uint256 randomSeed,
        address[] winners,
        address[] eligibleEntries
    );
    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);

    error RaffleNotFound();
    error RaffleNotOpen();
    error RaffleStillOpen();
    error DrawNotRequested();
    error DrawAlreadyRequested();
    error DrawDelayNotMet();
    error DrawWindowExpired();
    error NotIdentityMDHolder();
    error NotAdmin();
    error AlreadyEntered();
    error InvalidWinnerCount();
    error InvalidEndTime();
    error NoEntries();
    error NoEligibleEntries();
    error ZeroAddress();
    error CannotRemoveOwner();

    /// @notice Blocks between draw request and finalize.
    uint256 public constant DRAW_DELAY_BLOCKS = 5;
    /// @notice blockhash(drawRequestedAt) is zero after 256 blocks — finalize in time.
    uint256 public constant DRAW_FINALIZE_WINDOW = 250;

    constructor(address identityMD_, address initialOwner) Ownable(initialOwner) {
        if (identityMD_ == address(0)) revert ZeroAddress();
        identityMD = IERC721(identityMD_);
        admins[initialOwner] = true;
    }

    modifier onlyAdmin() {
        if (!isAdmin(msg.sender)) revert NotAdmin();
        _;
    }

    function isAdmin(address account) public view returns (bool) {
        return admins[account] || account == owner();
    }

    function addAdmin(address account) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        admins[account] = true;
        emit AdminAdded(account, msg.sender);
    }

    function removeAdmin(address account) external onlyOwner {
        if (account == owner()) revert CannotRemoveOwner();
        admins[account] = false;
        emit AdminRemoved(account, msg.sender);
    }

    function createRaffle(
        string calldata title,
        string calldata description,
        uint256 winnerCount,
        uint256 endsAt
    ) external onlyAdmin returns (uint256 raffleId) {
        if (winnerCount == 0) revert InvalidWinnerCount();
        if (endsAt <= block.timestamp) revert InvalidEndTime();

        raffleId = nextRaffleId++;
        _raffles[raffleId] = Raffle({
            title: title,
            description: description,
            winnerCount: winnerCount,
            endsAt: endsAt,
            status: RaffleStatus.Open,
            drawRequestedAt: 0,
            randomSeed: 0,
            winners: new address[](0)
        });

        emit RaffleCreated(raffleId, title, winnerCount, endsAt, msg.sender);
    }

    /// @notice Requires a signed transaction. One entry per wallet while raffle is open.
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

    function requestDraw(uint256 raffleId) external {
        Raffle storage raffle = _requireRaffle(raffleId);
        if (raffle.status != RaffleStatus.Open) revert DrawAlreadyRequested();
        if (block.timestamp < raffle.endsAt) revert RaffleStillOpen();
        if (_entries[raffleId].length == 0) revert NoEntries();

        raffle.status = RaffleStatus.DrawRequested;
        raffle.drawRequestedAt = block.number;

        emit DrawRequested(raffleId, block.number);
    }

    function finalizeDraw(uint256 raffleId) external nonReentrant {
        Raffle storage raffle = _requireRaffle(raffleId);
        if (raffle.status != RaffleStatus.DrawRequested) revert DrawNotRequested();
        if (block.number < raffle.drawRequestedAt + DRAW_DELAY_BLOCKS) {
            revert DrawDelayNotMet();
        }
        if (block.number > raffle.drawRequestedAt + DRAW_FINALIZE_WINDOW) {
            revert DrawWindowExpired();
        }

        address[] memory eligible = _filterEligibleEntries(_entries[raffleId]);
        if (eligible.length == 0) revert NoEligibleEntries();

        _eligibleEntriesAtDraw[raffleId] = eligible;

        uint256 winnerCount = raffle.winnerCount;
        if (winnerCount > eligible.length) {
            winnerCount = eligible.length;
        }

        uint256 seed = _deriveSeed(raffleId, eligible, raffle.drawRequestedAt);
        address[] memory winners = pickWinners(seed, eligible, winnerCount);

        raffle.randomSeed = seed;
        raffle.winners = winners;
        raffle.status = RaffleStatus.Closed;

        emit RaffleFinalized(raffleId, seed, winners, eligible);
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
            uint256 drawRequestedAt,
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
            raffle.drawRequestedAt,
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

    /// @notice Preview who would be eligible if finalize ran now (before close).
    function previewEligibleEntries(
        uint256 raffleId
    ) external view returns (address[] memory) {
        _requireRaffle(raffleId);
        return _filterEligibleEntries(_entries[raffleId]);
    }

    /// @notice Pure Fisher-Yates-style selection without replacement.
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

        address[] memory pool = new address[](entryCount);
        for (uint256 i = 0; i < entryCount; i++) {
            pool[i] = entries[i];
        }

        winners = new address[](winnerCount);
        uint256 remaining = entryCount;
        uint256 currentSeed = seed;

        for (uint256 w = 0; w < winnerCount; w++) {
            (uint256 index, uint256 nextSeed) = _boundedRandom(currentSeed, remaining);
            currentSeed = nextSeed;
            winners[w] = pool[index];
            pool[index] = pool[remaining - 1];
            remaining--;
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

        address[] memory eligible = _eligibleEntriesAtDraw[raffleId];
        uint256 winnerCount = raffle.winnerCount;
        if (winnerCount > eligible.length) {
            winnerCount = eligible.length;
        }

        recomputed = pickWinners(raffle.randomSeed, eligible, winnerCount);
        stored = raffle.winners;

        if (recomputed.length != stored.length) {
            return (false, recomputed, stored);
        }

        for (uint256 i = 0; i < stored.length; i++) {
            if (recomputed[i] != stored[i]) {
                return (false, recomputed, stored);
            }
        }

        return (true, recomputed, stored);
    }

    function _filterEligibleEntries(
        address[] storage entries
    ) internal view returns (address[] memory eligible) {
        uint256 count;
        uint256 len = entries.length;
        for (uint256 i = 0; i < len; i++) {
            if (identityMD.balanceOf(entries[i]) > 0) {
                count++;
            }
        }

        eligible = new address[](count);
        uint256 j;
        for (uint256 i = 0; i < len; i++) {
            if (identityMD.balanceOf(entries[i]) > 0) {
                eligible[j++] = entries[i];
            }
        }
    }

    function _deriveSeed(
        uint256 raffleId,
        address[] memory eligibleEntries,
        uint256 drawRequestedAt
    ) internal view returns (uint256) {
        bytes32 entriesHash = keccak256(abi.encode(eligibleEntries));
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.prevrandao,
                        blockhash(drawRequestedAt),
                        entriesHash,
                        raffleId,
                        drawRequestedAt
                    )
                )
            );
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
