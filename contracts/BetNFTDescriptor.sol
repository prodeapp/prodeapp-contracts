// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/utils/Strings.sol';
import 'base64-sol/base64.sol';
import './Market.sol';

interface ICurate {
    function isRegistered(bytes32 questionsHash) external view returns(bool);
	function getTitle(bytes32 _questionsHash) external view returns(string memory);
	function getTimestamp(bytes32 _questionsHash) external view returns(uint256);
}

library HexStrings {
    bytes16 internal constant ALPHABET = '0123456789abcdef';

    /// @notice Converts a `uint256` to its ASCII `string` hexadecimal representation with fixed length, without 0x.
    /// @dev Credit to Open Zeppelin under MIT license https://github.com/OpenZeppelin/openzeppelin-contracts/blob/243adff49ce1700e0ecb99fe522fb16cff1d1ddc/contracts/utils/Strings.sol#L55
    function toHexStringNoPrefix(uint256 value, uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2 * length);
        for (uint256 i = buffer.length; i > 0; i--) {
            buffer[i - 1] = ALPHABET[value & 0xf];
            value >>= 4;
        }
        return string(buffer);
    }
}

contract BetNFTDescriptor is Initializable { 

	using Strings for uint256;
	using HexStrings for uint256;

    address public curatedMarkets;

    function initialize(address _curatedMarkets) public initializer {
        curatedMarkets = _curatedMarkets;
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        string memory marketName = getMarketName();
        string memory nftName = generateName(tokenId, marketName);
        string memory marketFee = generateFee();
        string memory descriptionPartOne = generateDescriptionPartOne();
        string memory descriptionPartTwo =
            generateDescriptionPartTwo(
                tokenId,
                marketName,
                marketFee
            );
        string memory image = Base64.encode(bytes(generateSVGImage(
            tokenId,
            marketName,
            marketFee
        )));
        return
            string(
                abi.encodePacked(
                    'data:application/json;base64,',
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"',
                                nftName,
                                '", "description":"',
                                descriptionPartOne,
                                descriptionPartTwo,
                                '", "image": "',
                                'data:image/svg+xml;base64,',
                                image,
                                '"}'
                            )
                        )
                    )
                )
            );
    }

    function generateDescriptionPartOne() private pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    'This NFT represents a betting position in a prediction market pool. ',
                    'The owner of this NFT may claim a prize if this bet wins.\\n\\n'
                )
            );
    }

    function generateDescriptionPartTwo(
        uint256 tokenId,
        string memory marketName,
        string memory fee
    ) private view returns (string memory) {
        string memory marketAddress = addressToString(msg.sender);
        string memory link = string(
                abi.encodePacked(
                    'https://prode.eth.link/#/markets/',
                    marketAddress,
                    '/',
                    tokenId.toString()
                )
        );
        return
            string(
                abi.encodePacked(
                    'Market address: ',
                    marketAddress,
                    '\\nMarket name: ',
                    marketName,
                    '\\nFee: ',
                    fee,
                    '\\nToken ID: ',
                    tokenId.toString(),
                    '\\nFull display: ',
                    link,
                    '\\n\\n',
                    unicode'⚠️ DISCLAIMER: Due diligence is imperative when assessing this NFT. Make sure token addresses match the expected tokens, as token symbols may be imitated.'
                )
            );
    }

    function getMarketName() private view returns(string memory) {
        Market market = Market(msg.sender);
        bytes32 questionsHash = market.questionsHash();
        bool isRegistered = ICurate(curatedMarkets).isRegistered(questionsHash);

        if (isRegistered) {
            return ICurate(curatedMarkets).getTitle(questionsHash);
        } else {
            return market.name();
        }
    }

    function generateName(
        uint256 tokenId,
        string memory marketName
    ) private pure returns(string memory) {
        return
            string(
                abi.encodePacked(
                    'Bet ',
                    tokenId.toString(),
                    ' - ',
                    marketName
                )
            );
    }

    function generateFee() private view returns (string memory) {
        uint256 fee = Market(msg.sender).managementFee();
        uint256 units = fee/100;
        uint256 decimals = fee - 100 * units;
        if (decimals == 0) {
            return string(
                abi.encodePacked(
                    units.toString(),
                    '%'
                )
            );
        } else {
            return string(
                abi.encodePacked(
                    units.toString(),
                    '.',
                    decimals.toString(),
                    '%'
                )
            );
        }
    }

    function addressToString(address addr) internal pure returns (string memory) {
        return (uint256(uint160(addr))).toHexString(20);
    }

    function addThousandSeparator(string memory number) internal pure returns (string memory) {
        bytes memory numberBytes = bytes(number);
        uint256 totalSeparators = (numberBytes.length - 1) / 3;
        bytes memory buffer = new bytes(numberBytes.length + totalSeparators);
        uint256 nextDigit = 0;
        for (uint256 i = 0; i < buffer.length; i++) {
            if ((buffer.length - i) % 4 == 0 && i != 0 && i != buffer.length - 1) {
                buffer[i] = ",";
            } else {
                buffer[i] = numberBytes[nextDigit++];
            }   
        }
        return string(buffer);
    }

    function generateSVGImage(
        uint256 tokenId,
        string memory marketName,
        string memory marketFee
    ) internal view returns (string memory svg) {
        string memory jackpot = addThousandSeparator((msg.sender.balance / 10 ** 18).toString());

        string memory status = getStatus();

        Market market = Market(msg.sender);
        bytes32 tokenHash = market.tokenIDtoTokenHash(tokenId);
        string memory copies = market.bets(tokenHash).toString();

        return
            string(
                abi.encodePacked(
                    generateSVGDefs(),
                    generateSVGBorderText(marketName),
                    generateSVGCardMantle(jackpot, marketFee, status, copies),
                    generateCurationMark(),
                    generatePredictionsFootprint(tokenHash),
                    '</svg>'
                )
            );
    }

    function getStatus() internal view returns(string memory status) {
        Market market = Market(msg.sender);
        uint256 resultSubmissionPeriodStart = market.resultSubmissionPeriodStart();
        uint256 closingTime = market.closingTime();
        uint256 submissionTimeout = market.submissionTimeout();
        if (block.timestamp < closingTime) {
            status = "open to bets";
        } else if (
            block.timestamp > closingTime &&
            resultSubmissionPeriodStart == 0) {
            status = "waiting for results";
        } else if (
            resultSubmissionPeriodStart > 0 &&
            block.timestamp < resultSubmissionPeriodStart + submissionTimeout) {
            status = "building ranking";
        } else if (
            resultSubmissionPeriodStart > 0 &&
            block.timestamp > resultSubmissionPeriodStart + submissionTimeout) {
            status = "claim period";
        }
    }

    function tokenToColorHex(uint256 token, uint256 offset) internal pure returns (string memory str) {
        return string((token >> offset).toHexStringNoPrefix(3));
    }

    function sliceTokenHex(uint256 token, uint256 offset) internal pure returns (uint256) {
        return uint256(uint8(token >> offset));
    }

    function generateSVGDefs() private view returns (string memory svg) {
        uint256 uintAddress = uint256(uint160(msg.sender));
        uint256 radius = 20 + sliceTokenHex(uintAddress, 32) & 0x7f;
        uint256 std = sliceTokenHex(uintAddress, 40) & 0x3f;
        if (std > radius) std = std/2;
        svg = string(
            abi.encodePacked(
                '<svg width="290" height="500" viewBox="0 0 290 500" xmlns="http://www.w3.org/2000/svg"',
                " xmlns:xlink='http://www.w3.org/1999/xlink'>",
                '<defs>',
                '<filter id="f1"><feImage result="p1" xlink:href="data:image/svg+xml;base64,',
                Base64.encode(
                    bytes(
                        abi.encodePacked(
                            "<svg width='290' height='500' viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg'>",
                            "<circle cx='17' cy='276' r='",
                            radius.toString(),
                            "px' fill='#",
                            tokenToColorHex(uintAddress, 0),
                            "'/></svg>"
                        )
                    )
                ),
				'"/><feGaussianBlur ',
                'in="p1" stdDeviation="',
                std.toString(),
                '" /></filter> ',
				'<filter id="f2"> ',
				'<feTurbulence type="turbulence" baseFrequency="0.6" numOctaves="2" result="turbulence"/>'
          		'<feDisplacementMap in2="turbulence" in="SourceGraphic" scale="5" xChannelSelector="R" yChannelSelector="G"/>'
        		'</filter>'
				'<clipPath id="corners"><rect width="290" height="500" rx="42" ry="42" /></clipPath>',
                '<path id="text-path-a" d="M40 12 H250 A28 28 0 0 1 278 40 V460 A28 28 0 0 1 250 488 H40 A28 28 0 0 1 12 460 V40 A28 28 0 0 1 40 12 z" />',
                '<path id="minimap" d="M234 444C234 457.949 242.21 463 253 463" />',
                '<filter id="top-region-blur"><feGaussianBlur in="SourceGraphic" stdDeviation="24" /></filter>',
                '<mask id="none" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="white" /></mask>',
                '<linearGradient id="grad-symbol"><stop offset="0.7" stop-color="white" stop-opacity="1" /><stop offset=".95" stop-color="white" stop-opacity="0" /></linearGradient>',
                '<mask id="fade-symbol" maskContentUnits="userSpaceOnUse"><rect width="290px" height="200px" fill="url(#grad-symbol)" /></mask></defs>',
                '<g clip-path="url(#corners)">',
                '<rect x="0" y="0" width="290" height="500" rx="42" ry="42" fill="rgba(0,0,0,1)" stroke="rgba(255,255,255,0.2)" />',
                '<rect style="filter: url(#f1)" x="0px" y="0px" width="290px" height="500px" />',
                ' <g style="filter:url(#top-region-blur); transform:scale(1.5); transform-origin:center top;">',
                '<rect fill="none" x="0px" y="0px" width="290px" height="500px" />',
                '<ellipse cx="50%" cy="0px" rx="180px" ry="120px" fill="#000" opacity="0.85" /></g>',
                '</g>'
            )
        );
    }

    function generateSVGBorderText(
        string memory marketName
    ) private view returns (string memory svg) {
        svg = string(
            abi.encodePacked(
                '<text text-rendering="optimizeSpeed">',
                '<textPath startOffset="-100%" fill="white" font-family="\'Courier New\', monospace" font-size="10px" xlink:href="#text-path-a">',
                marketName,
                ' <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" />',
                '</textPath> <textPath startOffset="0%" fill="white" font-family="\'Courier New\', monospace" font-size="10px" xlink:href="#text-path-a">',
                marketName,
                ' <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" /> </textPath>',
                '<textPath startOffset="50%" fill="white" font-family="\'Courier New\', monospace" font-size="10px" xlink:href="#text-path-a">',
                'Market',
                unicode' • ',
                addressToString(msg.sender),
                ' <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s"',
                ' repeatCount="indefinite" /></textPath><textPath startOffset="-50%" fill="white" font-family="\'Courier New\', monospace" font-size="10px" xlink:href="#text-path-a">',
                'Market',
                unicode' • ',
                addressToString(msg.sender),
                ' <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" /></textPath></text>'
            )
        );
    }

    function generateSVGCardMantle(
        string memory jackpot,
        string memory fee,
        string memory status,
        string memory copies
    ) private pure returns (string memory svg) {
        svg = string(
            abi.encodePacked(
                '<g mask="url(#fade-symbol)">',
				'<rect fill="none" x="0px" y="0px" width="290px" height="200px" /> ',
				'<text y="60px" x="32px" fill="white" font-family="\'Courier New\', monospace" font-weight="200" font-size="11px">',
                'Jackpot: ',
                jackpot,
				' xDAI</text>',
				'<text y="78px" x="32px" fill="white" font-family="\'Courier New\', monospace" font-weight="200" font-size="11px">',
                'Management fee: ',
                fee,
				'</text>',
				'<text y="96px" x="32px" fill="white" font-family="\'Courier New\', monospace" font-weight="200" font-size="11px">',
                'Status: ',
                status,
				'</text>',
				'<text y="114px" x="32px" fill="white" font-family="\'Courier New\', monospace" font-weight="200" font-size="11px">',
                'Copies: ',
                copies,
				'</text></g>',
                '<rect x="16" y="16" width="258" height="468" rx="26" ry="26" fill="rgba(0,0,0,0)" stroke="rgba(255,255,255,0.2)" />'
            )
        );
    }

    function generateCurationMark() private view returns (string memory svg) {
        Market market = Market(msg.sender);
        bytes32 questionsHash = market.questionsHash();
        bool isRegistered = ICurate(curatedMarkets).isRegistered(questionsHash);
        uint256 startTime = ICurate(curatedMarkets).getTimestamp(questionsHash);

		if (!isRegistered || market.closingTime() > startTime) return '';

        svg = string(
            abi.encodePacked(
                '<g style="transform:translate(243px, 11px)">',
                '<rect width="36px" height="36px" rx="8px" ry="8px" fill="none" stroke="rgba(255,255,255,0.2)" />',
                '<svg x="5px" y="6px" fill="#4CAF50"><path d="M9,16.2L4.8,12l-1.4,1.4L9,19L21,7l-1.4-1.4L9,16.2z"/></svg>',
				'<svg x="8px" y="6px" fill="#4CAF50"><path d="M9,16.2L4.8,12l-1.4,1.4L9,19L21,7l-1.4-1.4L9,16.2z"/></svg>',
				'</g>'
            )
        );
    }

    function generatePredictionsFootprint(
        bytes32 predictionsHash
    ) private pure returns (string memory svg) {
        for (uint256 i = 0; i < 8; i++) {
            uint256 y = 5 + 36 * i;
            if (i >= 4) y += 6;
            string memory color = tokenToColorHex(uint256(predictionsHash), i * 4 * 8); // 4 bytes * 8 bits
            uint256 rx = sliceTokenHex(uint256(predictionsHash), (i * 4 + 3) * 8) & 0x0f;
            uint256 ry = (sliceTokenHex(uint256(predictionsHash), (i * 4 + 3) * 8) & 0xf0) >> 4;

            svg = string(
                abi.encodePacked(
                    svg,
                    '<rect style="filter: url(#f2)" width="20px" height="20px" y="',
                    y.toString(),
                    'px" x="6px" rx="',
                    rx.toString(),
                    'px" ry="',
                    ry.toString(),
                    'px" fill="#',
                    color,
                    '" />'
                )
            );
        }
        svg = string(
            abi.encodePacked(
                '<g style="transform:translate(220px, 154px)">',
                svg,
				'</g>'
            )
        );
    }
}