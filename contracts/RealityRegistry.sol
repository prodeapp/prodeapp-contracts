// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@reality.eth/contracts/development/contracts/RealityETH-3.0.sol";

contract RealityRegistry {

    struct QuestionMetadata {
        string title;
        string outcomes;
        string category;
        string language;
    }

    address public realitio;
    mapping (bytes32 => QuestionMetadata) public metadata;

    constructor(
        address _realitio
    ) {
        realitio = _realitio;
    }

    function registerQuestion(
        bytes32 question_id,
        uint256 template_id,
        uint32 opening_ts,
        string calldata title,
        string calldata outcomes,
        string calldata category,
        string calldata language
    ) external {
        {
            string memory question = string(
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
                
            bytes32 content_hash = keccak256(abi.encodePacked(template_id, opening_ts, question));
            
            require (content_hash == RealityETH_v3_0(realitio).getContentHash(question_id), "Wrong content hash");
        }

        metadata[question_id] = QuestionMetadata({title: title, outcomes: outcomes, category: category, language: language});
    }
}
