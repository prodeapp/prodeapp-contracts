// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IRealityRegistry {
    function registerQuestion(
        bytes32 question_id,
        uint256 template_id,
        uint32 opening_ts,
        string calldata title,
        string calldata outcomes,
        string calldata category,
        string calldata language
    ) external;

    function getQuestion(
        uint256 templateId,
        string calldata title,
        string calldata outcomes,
        string calldata category,
        string calldata language
    ) external view returns (string memory question);

    function metadata(bytes32 question_id)
        external
        view
        returns (
            string memory title,
            string memory outcomes,
            string memory category,
            string memory language,
            uint256 templateId
        );
}
