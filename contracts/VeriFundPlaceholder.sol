// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Standalone placeholder — NOT integrated with the VeriFund app or backend.
 *
 * Illustrative on-chain registry: stores opaque payload hashes keyed by an
 * anchor ID (e.g. UUID/commit digest off-chain). This does NOT validate hash
 * construction or signatures — only a persistence sketch for demos.
 */
contract VeriFundPlaceholderRegistry {
    uint256 public constant SCHEMA_VERSION = 1;

    address public owner;
    bool public paused;

    /// Total anchors recorded (includes batches as separate increments).
    uint256 public anchorCount;

    struct Anchor {
        bytes32 payloadHash;
        uint256 anchoredAt;
        address anchoredBy;
        uint256 sequence; // order of insertion within this contract
    }

    mapping(bytes32 => Anchor) public anchors;

    event Anchored(
        bytes32 indexed anchorId,
        bytes32 payloadHash,
        address indexed anchoredBy,
        uint256 sequence
    );

    event BatchAnchored(uint256 indexed count, address indexed by);

    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error ZeroAddress();
    error NotOwner();
    error Exists();
    error LengthMismatch();
    error PausedErr();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert PausedErr();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Pause new anchors (updates still blocked separately — demo simplicity).
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Store one payload hash under `anchorId` (caller supplies hashes only).
    function anchor(bytes32 anchorId, bytes32 payloadHash) external onlyOwner whenNotPaused {
        _anchor(msg.sender, anchorId, payloadHash);
    }

    /// @notice Anchor many IDs at once; `anchorIds.length` must equal `payloadHashes.length`.
    function anchorBatch(bytes32[] calldata anchorIds, bytes32[] calldata payloadHashes)
        external
        onlyOwner
        whenNotPaused
    {
        uint256 n = anchorIds.length;
        if (n != payloadHashes.length) revert LengthMismatch();

        for (uint256 i = 0; i < n; i++) {
            _anchor(msg.sender, anchorIds[i], payloadHashes[i]);
        }

        emit BatchAnchored(n, msg.sender);
    }

    function _anchor(address anchoredBy, bytes32 anchorId, bytes32 payloadHash) internal {
        if (anchors[anchorId].anchoredAt != 0) revert Exists();

        anchorCount += 1;
        anchors[anchorId] = Anchor({
            payloadHash: payloadHash,
            anchoredAt: block.timestamp,
            anchoredBy: anchoredBy,
            sequence: anchorCount
        });

        emit Anchored(anchorId, payloadHash, anchoredBy, anchorCount);
    }

    /// @notice Whether `anchorId` has ever been written (timestamp sentinel).
    function isAnchored(bytes32 anchorId) external view returns (bool) {
        return anchors[anchorId].anchoredAt != 0;
    }

    /// @notice Read anchor tuple without exposing mapping quirks to callers.
    function getAnchor(bytes32 anchorId)
        external
        view
        returns (bytes32 payloadHash, uint256 anchoredAt, address anchoredBy, uint256 sequence)
    {
        Anchor memory a = anchors[anchorId];
        return (a.payloadHash, a.anchoredAt, a.anchoredBy, a.sequence);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
