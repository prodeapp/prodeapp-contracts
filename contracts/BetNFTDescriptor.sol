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
    function getAd(address _market) external view returns (string memory);
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
                    generateAd(),
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
                '<path d="M1.89865 28.4701C1.49312 28.4701 1.1521 28.3319 0.8756 28.0554C0.617533 27.7973 0.4885 27.4655 0.4885 27.06V14.4516C0.506933 12.9953 0.84795 11.6865 1.51155 10.5252C2.17515 9.36395 3.07838 8.4515 4.22125 7.7879C5.36412 7.10587 6.65445 6.76485 8.09225 6.76485C9.54848 6.76485 10.848 7.10587 11.9909 7.7879C13.1338 8.4515 14.037 9.36395 14.7006 10.5252C15.3826 11.6865 15.7237 12.9953 15.7237 14.4516C15.7237 15.9078 15.4103 17.2165 14.7836 18.3778C14.1753 19.5207 13.3365 20.4332 12.2674 21.1152C11.1983 21.7788 9.99088 22.1106 8.64525 22.1106C7.55768 22.1106 6.55307 21.8894 5.6314 21.447C4.72817 20.9862 3.95397 20.3686 3.3088 19.5944V27.06C3.3088 27.4655 3.17977 27.7973 2.9217 28.0554C2.66363 28.3319 2.32262 28.4701 1.89865 28.4701ZM8.09225 19.6221C9.03235 19.6221 9.87107 19.4009 10.6084 18.9585C11.3457 18.4977 11.9264 17.8801 12.3504 17.106C12.7928 16.3133 13.014 15.4285 13.014 14.4516C13.014 13.4561 12.7928 12.5713 12.3504 11.7971C11.9264 11.0045 11.3457 10.387 10.6084 9.9446C9.87107 9.48377 9.03235 9.25335 8.09225 9.25335C7.17058 9.25335 6.33187 9.48377 5.5761 9.9446C4.83877 10.387 4.25812 11.0045 3.83415 11.7971C3.41018 12.5713 3.1982 13.4561 3.1982 14.4516C3.1982 15.4285 3.41018 16.3133 3.83415 17.106C4.25812 17.8801 4.83877 18.4977 5.5761 18.9585C6.33187 19.4009 7.17058 19.6221 8.09225 19.6221ZM20.87 12.5437C20.87 11.4377 21.1373 10.4515 21.6719 9.58515C22.2249 8.70035 22.9622 7.99988 23.8839 7.48375C24.8055 6.96762 25.8194 6.70955 26.9254 6.70955C28.0314 6.70955 28.8516 6.89388 29.3862 7.26255C29.9392 7.61278 30.1512 8.03675 30.0222 8.53445C29.9669 8.79252 29.8563 8.99528 29.6904 9.14275C29.5429 9.27178 29.3678 9.35473 29.165 9.3916C28.9622 9.42847 28.741 9.41925 28.5014 9.36395C27.3217 9.12432 26.2618 9.10588 25.3217 9.30865C24.3816 9.51142 23.635 9.8893 23.082 10.4423C22.5474 10.9953 22.2802 11.6958 22.2802 12.5437H20.87ZM20.8977 22C20.4553 22 20.1142 21.8894 19.8746 21.6682C19.635 21.4286 19.5152 21.0783 19.5152 20.6175V8.25795C19.5152 7.81555 19.635 7.47453 19.8746 7.2349C20.1142 6.99527 20.4553 6.87545 20.8977 6.87545C21.3585 6.87545 21.6995 6.99527 21.9207 7.2349C22.1603 7.4561 22.2802 7.79712 22.2802 8.25795V20.6175C22.2802 21.0599 22.1603 21.4009 21.9207 21.6405C21.6995 21.8802 21.3585 22 20.8977 22ZM38.2975 22.1106C36.8044 22.1106 35.4864 21.788 34.3435 21.1428C33.2007 20.4792 32.2974 19.576 31.6338 18.4331C30.9887 17.2718 30.6661 15.9447 30.6661 14.4516C30.6661 12.94 30.9887 11.6128 31.6338 10.4699C32.2974 9.30865 33.2007 8.40542 34.3435 7.76025C35.4864 7.09665 36.8044 6.76485 38.2975 6.76485C39.7722 6.76485 41.0809 7.09665 42.2238 7.76025C43.3667 8.40542 44.2607 9.30865 44.9058 10.4699C45.5695 11.6128 45.9013 12.94 45.9013 14.4516C45.9013 15.9447 45.5787 17.2718 44.9335 18.4331C44.2883 19.576 43.3943 20.4792 42.2515 21.1428C41.1086 21.788 39.7906 22.1106 38.2975 22.1106ZM38.2975 19.6221C39.256 19.6221 40.104 19.4009 40.8413 18.9585C41.5786 18.5161 42.1501 17.9078 42.5556 17.1336C42.9796 16.3594 43.1916 15.4654 43.1916 14.4516C43.1916 13.4377 42.9796 12.5437 42.5556 11.7695C42.1501 10.9769 41.5786 10.3593 40.8413 9.91695C40.104 9.47455 39.256 9.25335 38.2975 9.25335C37.339 9.25335 36.491 9.47455 35.7537 9.91695C35.0164 10.3593 34.4357 10.9769 34.0117 11.7695C33.5878 12.5437 33.3758 13.4377 33.3758 14.4516C33.3758 15.4654 33.5878 16.3594 34.0117 17.1336C34.4357 17.9078 35.0164 18.5161 35.7537 18.9585C36.491 19.4009 37.339 19.6221 38.2975 19.6221ZM56.5411 22.1106C55.1033 22.1106 53.8038 21.7788 52.6425 21.1152C51.4996 20.4332 50.5871 19.5115 49.9051 18.3502C49.2415 17.1889 48.9097 15.8801 48.9097 14.4239C48.9097 12.9677 49.2139 11.6681 49.8222 10.5252C50.4489 9.36395 51.2968 8.4515 52.366 7.7879C53.4351 7.10587 54.6425 6.76485 55.9881 6.76485C57.0757 6.76485 58.0803 6.99527 59.002 7.4561C59.9236 7.8985 60.6978 8.5068 61.3246 9.281V1.8155C61.3246 1.39153 61.4536 1.05052 61.7117 0.79245C61.9882 0.534383 62.3292 0.40535 62.7347 0.40535C63.1587 0.40535 63.4997 0.534383 63.7578 0.79245C64.0158 1.05052 64.1449 1.39153 64.1449 1.8155V14.4239C64.1449 15.8801 63.8038 17.1889 63.1218 18.3502C62.4582 19.5115 61.555 20.4332 60.4121 21.1152C59.2692 21.7788 57.9789 22.1106 56.5411 22.1106ZM56.5411 19.6221C57.4812 19.6221 58.3199 19.4009 59.0573 18.9585C59.7946 18.4977 60.3752 17.8709 60.7992 17.0783C61.2232 16.2857 61.4352 15.4009 61.4352 14.4239C61.4352 13.4285 61.2232 12.5437 60.7992 11.7695C60.3752 10.9953 59.7946 10.387 59.0573 9.9446C58.3199 9.48377 57.4812 9.25335 56.5411 9.25335C55.6194 9.25335 54.7807 9.48377 54.025 9.9446C53.2876 10.387 52.6978 10.9953 52.2554 11.7695C51.8314 12.5437 51.6194 13.4285 51.6194 14.4239C51.6194 15.4009 51.8314 16.2857 52.2554 17.0783C52.6978 17.8709 53.2876 18.4977 54.025 18.9585C54.7807 19.4009 55.6194 19.6221 56.5411 19.6221ZM75.8166 22.1106C74.2866 22.1106 72.9226 21.788 71.7244 21.1428C70.5447 20.4792 69.6138 19.576 68.9318 18.4331C68.2682 17.2718 67.9364 15.9447 67.9364 14.4516C67.9364 12.94 68.2497 11.6128 68.8765 10.4699C69.5216 9.30865 70.4064 8.40542 71.5309 7.76025C72.6553 7.09665 73.9456 6.76485 75.4019 6.76485C76.8397 6.76485 78.0747 7.08743 79.107 7.7326C80.1392 8.35933 80.9226 9.23492 81.4572 10.3593C82.0102 11.4653 82.2867 12.7465 82.2867 14.2027C82.2867 14.5529 82.1669 14.8479 81.9273 15.0875C81.6876 15.3087 81.3835 15.4193 81.0148 15.4193H69.8719V13.2073H80.9319L79.7982 13.9815C79.7798 13.0598 79.5954 12.2395 79.2452 11.5206C78.895 10.7833 78.3973 10.2027 77.7521 9.7787C77.1069 9.35473 76.3235 9.14275 75.4019 9.14275C74.3512 9.14275 73.4479 9.37317 72.6922 9.834C71.9548 10.2948 71.3926 10.9308 71.0055 11.7418C70.6184 12.5345 70.4249 13.4377 70.4249 14.4516C70.4249 15.4654 70.6553 16.3686 71.1161 17.1612C71.5769 17.9539 72.2129 18.5806 73.024 19.0414C73.835 19.5023 74.7659 19.7327 75.8166 19.7327C76.388 19.7327 76.9687 19.6313 77.5586 19.4285C78.1669 19.2073 78.6553 18.9585 79.024 18.682C79.3005 18.4792 79.5954 18.3778 79.9088 18.3778C80.2406 18.3594 80.5263 18.4516 80.766 18.6543C81.0793 18.9308 81.2452 19.235 81.2637 19.5668C81.2821 19.8986 81.1346 20.1843 80.8213 20.4239C80.1945 20.9216 79.4111 21.3272 78.471 21.6405C77.5493 21.9539 76.6645 22.1106 75.8166 22.1106Z" fill="#4267B3"/>',
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
                '<g mask="url(#fade-symbol)">',
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
				'</text></g>'
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

    function generateAd() private view returns (string memory svg) {
        string memory adSvg = IFirstPriceAuction(ads).getAd(address(this));
        if (bytes(adSvg).length == 0) {
            // TODO: add default base64 ad
            adSvg = '';
        }

        svg = string(
            abi.encodePacked(
                '<g clip-path="url(#corners)">',
                '<rect x="0" y="0" width="290" height="500" rx="42" ry="42" fill="rgba(0,0,0)" stroke="rgba(14,14,14)" />',
                '<g clip-path="url(#ad-margin)" style="transform:translate(0px, 35px)" >',
                '<image xlink:href="data:image/svg+xml;base64,',
                adSvg,
                '" /></g><text y="25px" x="50px" fill="#D0D0D0A8" font-family="\'Courier New\', monospace" font-size="15px">Ad curated by Kleros</text>',
                '<animate dur="1s" attributeName="opacity" from="1" to="0" begin="2s" repeatCount="1" fill="freeze" /></g>'
            )
        );
    }
}