// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@reality.eth/contracts/development/contracts/RealityETH-3.0.sol";
import "./IERC2981.sol";
import "./BetNFTDescriptor.sol";

contract Market is ERC721, IERC2981 {
    struct MarketInfo {
        string marketName;
        string marketSymbol;
    }

    struct Result {
        uint256 tokenID;
        uint248 points;
        bool claimed;
    }

    struct BetData {
        uint256 count;
        bytes32[] predictions;
    }

    uint256 public constant DIVISOR = 10000;

    MarketInfo private marketInfo;
    address public betNFTDescriptor;
    address public manager;
    RealityETH_v3_0 public realitio;
    uint256 public nextTokenID;
    bool public initialized;
    uint256 public resultSubmissionPeriodStart;
    uint256 public price;
    uint256 public closingTime;
    uint256 public submissionTimeout;
    uint256 public managementFee;
    uint256 public totalPrize;

    bytes32 public questionsHash;
    bytes32[] public questionIDs;
    uint16[] public prizeWeights;
    mapping(bytes32 => BetData) public bets; // bets[tokenHash]
    mapping(uint256 => Result) public ranking; // ranking[index]
    mapping(uint256 => bytes32) public tokenIDtoTokenHash; // tokenIDtoTokenHash[tokenID]
    mapping(uint256 => bool) public isRanked; // isRanked[tokenID]

    event FundingReceived(
        address indexed _funder,
        uint256 _amount,
        string _message
    );

    event PlaceBet(
        address indexed _player,
        uint256 indexed tokenID,
        bytes32 indexed _tokenHash,
        bytes32[] _predictions
    );

    event BetReward(uint256 indexed _tokenID, uint256 _reward);

    event RankingUpdated(uint256 indexed _tokenID, uint256 _points, uint256 _index);

    event ProviderReward(address indexed _provider, uint256 _providerReward);

    event ManagementReward(address indexed _manager, uint256 _managementReward);

    event QuestionsRegistered(bytes32[] _questionIDs);

    event Prizes(uint16[] _prizes);

    constructor() ERC721("", "") {}

    function initialize(
        MarketInfo memory _marketInfo,
        address _nftDescriptor,
        address _realityETH,
        uint256 _closingTime,
        uint256 _price,
        uint256 _submissionTimeout,
        uint256 _managementFee,
        address _manager,
        bytes32[] memory _questionIDs,
        uint16[] memory _prizeWeights
    ) external {
        require(!initialized, "Already initialized.");
        require(_managementFee < DIVISOR, "Management fee too big");

        marketInfo = _marketInfo;
        betNFTDescriptor = _nftDescriptor;
        realitio = RealityETH_v3_0(_realityETH);
        closingTime = _closingTime;
        price = _price;
        submissionTimeout = _submissionTimeout;
        managementFee = _managementFee;
        manager = _manager;

        questionsHash = keccak256(abi.encodePacked(_questionIDs));
        questionIDs = _questionIDs;

        uint256 sumWeights;
        for (uint256 i = 0; i < _prizeWeights.length; i++) {
            sumWeights += uint256(_prizeWeights[i]);
        }
        require(sumWeights == DIVISOR, "Invalid weights");
        prizeWeights = _prizeWeights;

        initialized = true;
        emit QuestionsRegistered(questionIDs); 
        emit Prizes(_prizeWeights);
    }

    /** @dev Places a bet by providing predictions to each question. A bet NFT is minted.
     *  @param _results Answer predictions to the questions asked in Realitio.
     *  @return the minted token id.
     */
    function placeBet(bytes32[] calldata _results)
        public
        payable
        returns (uint256)
    {
        require(_results.length == questionIDs.length, "Results mismatch");
        require(msg.value == price, "Wrong value sent");
        require(block.timestamp < closingTime, "Bets not allowed");

        bytes32 tokenHash = keccak256(abi.encodePacked(_results));
        tokenIDtoTokenHash[nextTokenID] = tokenHash;
        BetData storage bet = bets[tokenHash];
        if (bet.count == 0) bet.predictions = _results;
        bet.count += 1;

        _mint(msg.sender, nextTokenID);
        emit PlaceBet(msg.sender, nextTokenID, tokenHash, _results);

        return nextTokenID++;
    }

    /** @dev Places a bet by providing predictions to each question. A bet NFT is minted. A provider can be specified.
     *  @param _provider Address to which to send a fee. If 0x0, it's ignored. Meant to be used by front-end providers.
     *  @param _results Answer predictions to the questions asked in Realitio.
     *  @return the minted token id.
     */
    function placeBetWithProvider(address payable _provider, bytes32[] calldata _results)
        external
        payable
        returns (uint256)
    {
        uint256 providerReward = (msg.value * managementFee) / DIVISOR;
        _provider.send(providerReward);
        emit ProviderReward(_provider, providerReward);

        return placeBet(_results);
    }

    /** @dev Passes the contract state to the submission period if all the Realitio results are available.
     *  The management fee is paid to the manager address.
     */
    function registerAvailabilityOfResults() external {
        require(block.timestamp > closingTime, "Bets ongoing");
        require(resultSubmissionPeriodStart == 0, "Results already available");

        for (uint256 i = 0; i < questionIDs.length; i++) {
            realitio.resultForOnceSettled(questionIDs[i]); // Reverts if not finalized.
        }

        resultSubmissionPeriodStart = block.timestamp;
        uint256 marketBalance = address(this).balance;
        uint256 managementReward = (marketBalance * managementFee) / DIVISOR;
        payable(manager).send(managementReward);
        totalPrize = marketBalance - managementReward;

        emit ManagementReward(manager, managementReward);
    }

    /** @dev Registers the points obtained by a bet after the results are known. Ranking should be filled
     *  in descending order. Bets which points were not registered cannot claimed rewards even if they
     *  got more points than the ones registered.
     *  @param _tokenID The token id of the bet which points are going to be registered.
     *  @param _rankIndex The alleged ranking position the bet belongs to.
     *  @param _duplicates The alleged number of tokens that are already registered and have the same points as _tokenID.
     */
    function registerPoints(uint256 _tokenID, uint256 _rankIndex, uint256 _duplicates) external {
        require(resultSubmissionPeriodStart != 0, "Not in submission period");
        require(
            block.timestamp < resultSubmissionPeriodStart + submissionTimeout,
            "Submission period over"
        );
        require(_exists(_tokenID), "Token does not exist");
        require(!isRanked[_tokenID], "Token already registered");

        bytes32[] memory predictions = bets[tokenIDtoTokenHash[_tokenID]].predictions;
        uint248 totalPoints;
        for (uint256 i = 0; i < questionIDs.length; i++) {
            if (predictions[i] == realitio.resultForOnceSettled(questionIDs[i])) {
                totalPoints += 1;
            }
        }

        require(totalPoints > 0, "You are not a winner");
        // This ensures that ranking[N].points >= ranking[N+1].points always
        require(
            _rankIndex == 0 || totalPoints < ranking[_rankIndex - 1].points, 
            "Invalid ranking index"
        );
        if (totalPoints > ranking[_rankIndex].points) {
            if (ranking[_rankIndex].points > 0) {
                // Rank position is being overwritten
                isRanked[ranking[_rankIndex].tokenID] = false;
            }
            ranking[_rankIndex].tokenID = _tokenID;
            ranking[_rankIndex].points = totalPoints;
            isRanked[_tokenID] = true;
            emit RankingUpdated(_tokenID, totalPoints, _rankIndex);
        } else if (ranking[_rankIndex].points == totalPoints) {
            uint256 realRankIndex = _rankIndex + _duplicates;
            require(totalPoints > ranking[realRankIndex].points, "Wrong _duplicates amount");
            require(totalPoints == ranking[realRankIndex - 1].points, "Wrong _duplicates amount");
            if (ranking[realRankIndex].points > 0) {
                // Rank position is being overwritten
                isRanked[ranking[realRankIndex].tokenID] = false;
            }
            ranking[realRankIndex].tokenID = _tokenID;
            ranking[realRankIndex].points = totalPoints;
            isRanked[_tokenID] = true;
            emit RankingUpdated(_tokenID, totalPoints, realRankIndex);
        }
    }

    /** @dev Sends a prize to the token holder if applicable.
     *  @param _rankIndex The ranking position of the bet which reward is being claimed.
     *  @param _firstSharedIndex If there are many tokens sharing the same score, this is the first ranking position of the batch.
     *  @param _lastSharedIndex If there are many tokens sharing the same score, this is the last ranking position of the batch.
     */
    function claimRewards(
        uint256 _rankIndex,
        uint256 _firstSharedIndex,
        uint256 _lastSharedIndex
    ) external {
        require(resultSubmissionPeriodStart != 0, "Not in claim period");
        require(
            block.timestamp > resultSubmissionPeriodStart + submissionTimeout,
            "Submission period not over"
        );
        require(!ranking[_rankIndex].claimed, "Already claimed");

        uint248 points = ranking[_rankIndex].points;
        // Check that shared indexes are valid.
        require(points == ranking[_firstSharedIndex].points, "Wrong start index");
        require(points == ranking[_lastSharedIndex].points, "Wrong end index");
        require(points > ranking[_lastSharedIndex + 1].points, "Wrong end index");
        require(
            _firstSharedIndex == 0 || points < ranking[_firstSharedIndex - 1].points, 
            "Wrong start index"
        );
        uint256 sharedBetween = _lastSharedIndex - _firstSharedIndex + 1;

        uint256 cumWeigths = 0;
        for (uint256 i = _firstSharedIndex; i < prizeWeights.length && i <= _lastSharedIndex; i++) {
            cumWeigths += prizeWeights[i];
        }

        uint256 reward = (totalPrize * cumWeigths) / (DIVISOR * sharedBetween);
        ranking[_rankIndex].claimed = true;
        payable(ownerOf(ranking[_rankIndex].tokenID)).transfer(reward);
        emit BetReward(ranking[_rankIndex].tokenID, reward);
    }

    /** @dev Edge case in which no one won or winners were not registered. All players who own a token
     *  are reimburse proportionally (management fee was discounted). Tokens are burnt.
     *  @param _tokenID The token id.
     */
    function reimbursePlayer(uint256 _tokenID) external {
        require(resultSubmissionPeriodStart != 0, "Not in claim period");
        require(
            block.timestamp > resultSubmissionPeriodStart + submissionTimeout,
            "Submission period not over"
        );
        require(ranking[0].points == 0, "Can't reimburse if there are winners");

        uint256 reimbursement = totalPrize / nextTokenID;
        address player = ownerOf(_tokenID);
        _burn(_tokenID); // Can only be reimbursed once.
        payable(player).transfer(reimbursement);
    }

    /** @dev Edge case in which there is a winner but one or more prizes are vacant.
     *  Vacant prizes are distributed equally among registered winner/s.
     */
    function distributeRemainingPrizes() external {
        require(resultSubmissionPeriodStart != 0, "Not in claim period");
        require(
            block.timestamp > resultSubmissionPeriodStart + submissionTimeout,
            "Submission period not over"
        );
        require(ranking[0].points > 0, "No winners");

        uint256 cumWeigths = 0;
        uint256 nWinners = 0;
        for (uint256 i = 0; i < prizeWeights.length; i++) {
            if (ranking[i].points == 0) {
                if (nWinners == 0) nWinners = i;
                require(!ranking[i].claimed, "Already claimed");
                ranking[i].claimed = true;
                cumWeigths += prizeWeights[i];
            }
        }

        require(cumWeigths > 0, "No vacant prizes");
        uint256 vacantPrize = (totalPrize * cumWeigths) / (DIVISOR * nWinners);
        for (uint256 rank = 0; rank < nWinners; rank++) {
            payable(ownerOf(ranking[rank].tokenID)).send(vacantPrize);
            emit BetReward(ranking[rank].tokenID, vacantPrize);
        }
    }

    /** @dev Increases the balance of the market without participating. Only callable during the betting period.
     *  @param _message The message to publish.
     */
    function fundMarket(string calldata _message) external payable {
        require(resultSubmissionPeriodStart == 0, "Results already available");
        emit FundingReceived(msg.sender, msg.value, _message);
    }

    /**
     * @dev See {IERC721Metadata-name}.
     */
    function name() public view override returns (string memory) {
        return marketInfo.marketName;
    }

    /**
     * @dev See {IERC721Metadata-symbol}.
     */
    function symbol() public view override returns (string memory) {
        return marketInfo.marketSymbol;
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return BetNFTDescriptor(betNFTDescriptor).tokenURI(tokenId);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721)
        returns (bool)
    {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function royaltyInfo(uint256, uint256 _salePrice)
        external
        view
        override(IERC2981)
        returns (address receiver, uint256 royaltyAmount)
    {
        receiver = manager;
        // royalty fee = management fee
        royaltyAmount = (_salePrice * managementFee) / DIVISOR;
    }
}
