// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/utils/Strings.sol';
import 'base64-sol/base64.sol';
import "./IMarket.sol";

interface ICurate {
    function isRegistered(bytes32 questionsHash) external view returns(bool);
	function getTitle(bytes32 _questionsHash) external view returns(string memory);
	function getTimestamp(bytes32 _questionsHash) external view returns(uint256);
}

interface IFirstPriceAuction {
    function getAd(address _market, uint256 _tokenID) external view returns (string memory);
    function getRef(address _market, uint256 _tokenID) external view returns (string memory);
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
    address public ads;

    function initialize(address _curatedMarkets) public initializer {
        curatedMarkets = _curatedMarkets;
    }

    function setAdsAddress(address _ads) external {
        require(ads == address(0x0), "address already set");
        ads = _ads;
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
                    'https://prode.eth.limo/#/markets/',
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
        IMarket market = IMarket(msg.sender);
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
        (uint16 fee,,,,) = IMarket(msg.sender).marketInfo();
        uint256 units = fee/100;
        uint256 decimals = uint256(fee) - 100 * units;
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

        IMarket market = IMarket(msg.sender);
        bytes32 tokenHash = market.tokenIDtoTokenHash(tokenId);
        string memory copies = market.bets(tokenHash).toString();

        return
            string(
                abi.encodePacked(
                    generateSVGDefs(),
                    generateLogo(),
                    generateSVGCardMantle(jackpot, marketFee, status, copies),
                    generateSVGFootText(marketName),
                    generateCurationMark(),
                    generatePredictionsFingerprint(tokenHash),
                    generateAd(tokenId),
                    '</svg>'
                )
            );
    }

    function getStatus() internal view returns(string memory status) {
        IMarket market = IMarket(msg.sender);
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
				'<clipPath id="ad-margin"><rect width="290" height="430" /></clipPath>',
                '<filter id="top-region-blur"><feGaussianBlur in="SourceGraphic" stdDeviation="24" /></filter>',
                '</defs>',
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

    function generateSVGFootText(
        string memory marketName
    ) private view returns (string memory svg) {
        svg = string(
            abi.encodePacked(
                '<text y="464px" x="18px" fill="white" font-family="\'Courier New\', monospace" font-size="10px">',
                marketName,
                '</text>',
                '<text y="479px" x="18px" fill="white" font-family="\'Courier New\', monospace" font-size="10px">',
                addressToString(msg.sender),
                '</text>'
            )
        );
    }

    function generateLogo() private pure returns (string memory svg) {
        svg = string(
            abi.encodePacked(
                '<g><svg width="83" height="29" x="32px" y="15px" fill="none">',
                '<path d="M 82.176 15.015 L 71.033 15.015 L 71.033 12.803 L 82.093 12.803 L 80.96 13.578 Q 80.932 12.195 80.407 11.103 Q 79.881 10.011 78.914 9.375 A 4.185 4.185 0 0 0 76.563 8.739 Q 74.987 8.739 73.868 9.43 Q 72.748 10.121 72.167 11.324 Q 71.586 12.527 71.586 14.048 A 5.291 5.291 0 0 0 72.278 16.757 Q 72.969 17.946 74.186 18.637 A 5.553 5.553 0 0 0 76.978 19.329 Q 77.835 19.329 78.734 19.011 A 5.454 5.454 0 0 0 80.186 18.278 Q 80.6 17.974 81.084 17.96 A 1.465 1.465 0 0 1 81.126 17.959 A 1.203 1.203 0 0 1 81.928 18.25 A 1.31 1.31 0 0 1 82.425 19.163 A 0.989 0.989 0 0 1 82.427 19.218 A 0.991 0.991 0 0 1 81.983 20.02 Q 81.043 20.767 79.646 21.237 A 8.36 8.36 0 0 1 76.978 21.707 Q 74.683 21.707 72.9 20.725 Q 71.116 19.743 70.107 18.015 A 7.722 7.722 0 0 1 69.098 14.048 Q 69.098 11.78 70.052 10.052 A 6.975 6.975 0 0 1 72.692 7.342 Q 74.379 6.361 76.563 6.361 Q 78.72 6.361 80.269 7.315 Q 81.817 8.269 82.633 9.942 Q 83.448 11.614 83.448 13.799 A 1.157 1.157 0 0 1 83.089 14.67 Q 82.729 15.015 82.176 15.015 Z M 62.075 8.877 L 62.075 1.412 Q 62.075 0.776 62.476 0.388 A 1.394 1.394 0 0 1 63.485 0.001 Q 64.121 0.001 64.508 0.388 A 1.383 1.383 0 0 1 64.895 1.412 L 64.895 14.02 A 7.688 7.688 0 0 1 63.886 17.946 A 7.498 7.498 0 0 1 61.162 20.697 Q 59.448 21.707 57.291 21.707 A 7.56 7.56 0 0 1 53.407 20.697 Q 51.678 19.688 50.669 17.946 Q 49.66 16.204 49.66 14.02 A 8.15 8.15 0 0 1 50.586 10.107 A 7.172 7.172 0 0 1 53.116 7.37 Q 54.72 6.361 56.738 6.361 Q 58.37 6.361 59.752 7.038 Q 61.135 7.716 62.075 8.877 Z M 0.001 26.656 L 0.001 14.048 Q 0.028 11.863 1.024 10.121 Q 2.019 8.379 3.733 7.37 Q 5.448 6.361 7.604 6.361 A 7.539 7.539 0 0 1 11.503 7.37 Q 13.217 8.379 14.227 10.121 Q 15.236 11.863 15.236 14.048 A 8.15 8.15 0 0 1 14.309 17.96 A 7.172 7.172 0 0 1 11.78 20.697 Q 10.176 21.707 8.157 21.707 Q 6.526 21.707 5.157 21.029 Q 3.789 20.352 2.821 19.19 L 2.821 26.656 Q 2.821 27.264 2.434 27.665 Q 2.047 28.066 1.411 28.066 Q 0.802 28.066 0.402 27.665 Q 0.001 27.264 0.001 26.656 Z M 38.628 21.707 Q 36.388 21.707 34.674 20.725 Q 32.959 19.743 31.978 18.015 Q 30.996 16.287 30.996 14.048 Q 30.996 11.78 31.978 10.052 A 7.115 7.115 0 0 1 34.674 7.342 Q 36.388 6.361 38.628 6.361 Q 40.84 6.361 42.554 7.342 A 7.115 7.115 0 0 1 45.25 10.052 Q 46.231 11.78 46.231 14.048 Q 46.231 16.287 45.264 18.015 A 7.016 7.016 0 0 1 42.582 20.725 A 7.816 7.816 0 0 1 38.628 21.707 Z M 19.439 20.214 L 19.439 7.854 A 1.384 1.384 0 0 1 19.798 6.831 A 1.384 1.384 0 0 1 20.821 6.471 A 1.408 1.408 0 0 1 21.858 6.817 A 1.408 1.408 0 0 1 22.204 7.854 L 22.204 20.214 A 1.417 1.417 0 0 1 21.858 21.237 A 1.375 1.375 0 0 1 20.821 21.596 A 1.417 1.417 0 0 1 19.798 21.25 Q 19.439 20.905 19.439 20.214 Z M 38.628 19.218 Q 40.065 19.218 41.171 18.555 Q 42.277 17.891 42.9 16.73 Q 43.522 15.568 43.522 14.048 Q 43.522 12.527 42.9 11.352 A 4.617 4.617 0 0 0 41.171 9.513 Q 40.065 8.849 38.628 8.849 Q 37.19 8.849 36.084 9.513 Q 34.978 10.177 34.342 11.352 Q 33.706 12.527 33.706 14.048 A 5.494 5.494 0 0 0 34.342 16.73 A 4.74 4.74 0 0 0 36.084 18.555 Q 37.19 19.218 38.628 19.218 Z M 57.291 19.218 A 4.72 4.72 0 0 0 59.808 18.541 Q 60.914 17.863 61.55 16.674 Q 62.185 15.485 62.185 14.02 Q 62.185 12.527 61.55 11.366 Q 60.914 10.204 59.808 9.527 Q 58.702 8.849 57.291 8.849 Q 55.909 8.849 54.789 9.527 A 4.914 4.914 0 0 0 53.019 11.366 Q 52.37 12.527 52.37 14.02 Q 52.37 15.485 53.019 16.674 A 4.858 4.858 0 0 0 54.789 18.541 Q 55.909 19.218 57.291 19.218 Z M 7.604 19.218 A 4.72 4.72 0 0 0 10.121 18.541 Q 11.227 17.863 11.876 16.688 Q 12.526 15.513 12.526 14.048 Q 12.526 12.554 11.876 11.379 Q 11.227 10.204 10.121 9.527 Q 9.015 8.849 7.604 8.849 Q 6.222 8.849 5.102 9.527 Q 3.982 10.204 3.346 11.379 Q 2.71 12.554 2.71 14.048 A 5.458 5.458 0 0 0 3.346 16.688 Q 3.982 17.863 5.102 18.541 Q 6.222 19.218 7.604 19.218 Z M 22.204 12.14 L 20.793 12.14 A 5.518 5.518 0 0 1 21.609 9.167 A 5.979 5.979 0 0 1 23.807 7.08 Q 25.19 6.306 26.849 6.306 Q 28.508 6.306 29.323 6.845 A 1.225 1.225 0 0 1 29.983 7.852 A 1.109 1.109 0 0 1 29.946 8.13 A 1.062 1.062 0 0 1 29.628 8.725 A 1.098 1.098 0 0 1 29.088 8.988 Q 28.784 9.043 28.425 8.96 A 9.117 9.117 0 0 0 26.613 8.765 A 6.477 6.477 0 0 0 25.245 8.905 Q 23.835 9.209 23.019 10.038 Q 22.204 10.868 22.204 12.14 Z" fill="#4267B3"/>',
                '</svg></g>'
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
				'<rect fill="none" x="0px" y="0px" width="290px" height="200px" /> ',
				'<text y="65px" x="32px" fill="white" font-family="\'Courier New\', monospace" font-size="14px">',
                'Jackpot: ',
                jackpot,
				' xDAI</text>',
				'<text y="83px" x="32px" fill="white" font-family="\'Courier New\', monospace" font-size="10px">',
                'Management fee: ',
                fee,
				'</text>',
				'<text y="98px" x="32px" fill="white" font-family="\'Courier New\', monospace" font-size="10px">',
                'Status: ',
                status,
				'</text>',
				'<text y="113px" x="32px" fill="white" font-family="\'Courier New\', monospace" font-size="10px">',
                'Copies: ',
                copies,
				'</text>'
            )
        );
    }

    function generateCurationMark() private view returns (string memory svg) {
        IMarket market = IMarket(msg.sender);
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

    function generatePredictionsFingerprint(
        bytes32 predictionsHash
    ) private pure returns (string memory svg) {
        for (uint256 i = 0; i < 8; i++) {
            uint256 y = 82 + 30 * ( i % 4 );
            uint256 x = 0;
            if (i >= 4) {
                x = 30;
            }
            if (i % 4 >= 2) {
                y += 12;
            }
            string memory color = tokenToColorHex(uint256(predictionsHash), i * 4 * 8); // 4 bytes * 8 bits
            uint256 rx = sliceTokenHex(uint256(predictionsHash), (i * 4 + 3) * 8) & 0x0f;
            uint256 ry = (sliceTokenHex(uint256(predictionsHash), (i * 4 + 3) * 8) & 0xf0) >> 4;

            svg = string(
                abi.encodePacked(
                    svg,
                    '<rect style="filter: url(#f2)" width="20px" height="20px" y="',
                    y.toString(),
                    'px" x="',
                    x.toString(),
                    'px" rx="',
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
                '<g style="transform:translate(220px, 142px)">',
                svg,
				'</g>'
            )
        );
    }

    function generateAd(uint256 tokenId) private view returns (string memory) {
        string memory adSvg = IFirstPriceAuction(ads).getAd(msg.sender, tokenId);
        if (bytes(adSvg).length == 0) {
            return '';
        } else {
            adSvg = string(
                abi.encodePacked(
                    '<image xlink:href="data:image/svg+xml;base64,',
                    adSvg,
                    '" />'
                )
            );
        }

        string memory adLink = IFirstPriceAuction(ads).getRef(msg.sender, tokenId);
        if (bytes(adLink).length > 0) {
            adSvg = string(
            abi.encodePacked(
                '<a href="',
                adLink,
                '"  target="_blank">',
                adSvg,
                '</a>'
            )
        );
        }

        return string(
            abi.encodePacked(
                '<g clip-path="url(#corners)">',
                '<rect x="0" y="0" width="290" height="500" rx="42" ry="42" fill="rgba(0,0,0)" stroke="rgba(14,14,14)" />',
                '<g clip-path="url(#ad-margin)" style="transform:translate(0px, 35px)" >',
                adSvg,
                '</g><text y="25px" x="50px" fill="#D0D0D0A8" font-family="\'Courier New\', monospace" font-size="15px">Ad curated by Kleros</text>',
                '<animate dur="1s" attributeName="opacity" from="1" to="0" begin="2s" repeatCount="1" fill="freeze" /></g>'
            )
        );
    }
}