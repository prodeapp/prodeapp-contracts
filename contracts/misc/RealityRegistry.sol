// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@reality.eth/contracts/development/contracts/RealityETH-3.0.sol";

contract RealityRegistry {

    struct QuestionMetadata {
        string title;
        string outcomes;
        string category;
        string language;
        uint256 templateId;
    }

    address public realitio;
    mapping (bytes32 => QuestionMetadata) public metadata;

    constructor(
        address _realitio
    ) {
        realitio = _realitio;
    }

    function registerQuestion(
        bytes32 questionId,
        uint256 templateId,
        uint32 openingTs,
        string calldata title,
        string calldata outcomes,
        string calldata category,
        string calldata language
    ) external {
        {
            string memory question = getQuestion(
                templateId,
                title,
                outcomes,
                category,
                language
            );

            bytes32 content_hash = keccak256(abi.encodePacked(templateId, openingTs, question));

            require (content_hash == RealityETH_v3_0(realitio).getContentHash(questionId), "Wrong content hash");
        }

        metadata[questionId] = QuestionMetadata({title: title, outcomes: outcomes, category: category, language: language, templateId: templateId});
    }

    function getQuestion(
        uint256 templateId,
        string calldata title,
        string calldata outcomes,
        string calldata category,
        string calldata language
    ) public pure returns (string memory question) {

        if (templateId == 2 || templateId == 3) {
            return string(
                abi.encodePacked(
                        title,
                        '\u241f',
                        outcomes,
                        '\u241f',
                        category,
                        '\u241f',
                        language
                    )
            );
        }


        return string(
            abi.encodePacked(
                title,
                '\u241f',
                category,
                '\u241f',
                language
            )
        );
    }
}
