const hre = require("hardhat");
const ethers = hre.ethers;
const {getChain, orderQuestions, toTimestamp} = require("./helpers");

const timeout = 129600; // 1.5 days
const marketData = {
  marketName: "ICC Men's T20 World Cup Australia 2022", 
  marketSymbol: "PRODE",
  closingTime: toTimestamp("2022-10-15 00:00:00 UTC"),
  price: ethers.utils.parseUnits("15.0", "ether"), // 15 xDAI
  creator: "0xE0Ed01B57920D51c5421b3DBadEC8e5FB5C64Faa", // Ownable creator contract CreatorRelayer.sol
  creatorFee: 500, // 5%
  minBond: ethers.utils.parseUnits("5.0", "ether"), // 5 xDAI
  questions: [
    {
      templateID: 2, 
      question: "What will be the result of the Sri Lanka vs Namibia match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Sri Lanka\",\"Namibia\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-17 04:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the United Arab Emirate vs Netherlands match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"United Arab Emirate\",\"Netherlands\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-17 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the West Indies vs Scotland match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"West Indies\",\"Scotland\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-18 04:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Zimbabwe vs Ireland match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Zimbabwe\",\"Ireland\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-18 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Namibia vs Netherlands match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Namibia\",\"Netherlands\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-19 04:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Sri Lanka vs United Arab Emirates match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Sri Lanka\",\"United Arab Emirates\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-19 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Scotland vs Ireland match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Scotland\",\"Ireland\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-20 04:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the West Indies vs Zimbabwe match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"West Indies\",\"Zimbabwe\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-20 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Netherlands vs Sri Lanka match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Netherlands\",\"Sri Lanka\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-21 04:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Namibia vs United Arab Emirates match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Namibia\",\"United Arab Emirates\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-21 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Ireland vs West Indies match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Ireland\",\"West Indies\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-22 04:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Scotland vs Zimbabwe match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Scotland\",\"Zimbabwe\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-22 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Australia vs New Zealand match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Australia\",\"New Zealand\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-23 07:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the England vs Afghanistan match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"England\",\"Afghanistan\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-23 11:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the group A winner vs group B runner-up match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Namibia\",\"Sri Lanka\",\"United Arab Emirates\",\"Netherlands\",\"Ireland\",\"Scotland\",\"West Indies\",\"Zimbabwe\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-24 04:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the India vs Pakistan match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"India\",\"Pakistan\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-24 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Bangladesh vs group A runner-up match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Bangladesh\",\"Namibia\",\"Sri Lanka\",\"United Arab Emirates\",\"Netherlands\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-25 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the South Africa vs group B winner match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"South Africa\",\"Ireland\",\"Scotland\",\"West Indies\",\"Zimbabwe\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-25 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Australia vs group A winner match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Australia\",\"Namibia\",\"Sri Lanka\",\"United Arab Emirates\",\"Netherlands\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-26 11:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the England vs group B runner-up match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"England\",\"Ireland\",\"Scotland\",\"West Indies\",\"Zimbabwe\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-27 04:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the New Zealand vs Afghanistan match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"New Zealand\",\"Afghanistan\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-27 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the South Africa vs Bangladesh match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"South Africa\",\"Bangladesh\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-28 03:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the India vs group A runner-up match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"India\",\"Namibia\",\"Sri Lanka\",\"United Arab Emirates\",\"Netherlands\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-28 07:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Pakistan vs group B winner match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Zimbabwe\",\"Ireland\",\"Scotland\",\"West Indies\",\"Zimbabwe\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-28 11:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Afghanistan vs group B runner-up match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Afghanistan\",\"Ireland\",\"Scotland\",\"West Indies\",\"Zimbabwe\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-29 04:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Australia vs England match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Australia\",\"England\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-29 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the New Zealand vs group A winner match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"New Zealand\",\"Namibia\",\"Sri Lanka\",\"United Arab Emirates\",\"Netherlands\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-30 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Bangladesh vs group B winner match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Bangladesh\",\"Ireland\",\"Scotland\",\"West Indies\",\"Zimbabwe\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-31 03:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Pakistan vs group A runner-up match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Pakistan\",\"Namibia\",\"Sri Lanka\",\"United Arab Emirates\",\"Netherlands\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-31 07:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the India vs South Africa match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"India\",\"South Africa\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-10-31 11:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Australia vs group B runner-up match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Australia\",\"Ireland\",\"Scotland\",\"West Indies\",\"Zimbabwe\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-01 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Afghanistan vs group A winner match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Afghanistan\",\"Namibia\",\"Sri Lanka\",\"United Arab Emirates\",\"Netherlands\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-02 04:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the England vs New Zealand match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"England\",\"New Zealand\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-02 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the group B winner vs group A runner-up match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Ireland\",\"Scotland\",\"West Indies\",\"Zimbabwe\",\"Namibia\",\"Sri Lanka\",\"United Arab Emirates\",\"Netherlands\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-03 04:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the India vs Bangladesh match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"India\",\"Bangladesh\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-03 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Pakistan vs South Africa match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Pakistan\",\"South Africa\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-04 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the New Zealand vs group B runner-up match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"New Zealand\",\"Ireland\",\"Scotland\",\"West Indies\",\"Zimbabwe\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-05 04:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Australia vs Afghanistan match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Australia\",\"Afghanistan\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-05 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the England vs group A winner match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"England\",\"Namibia\",\"Sri Lanka\",\"United Arab Emirates\",\"Netherlands\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-06 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the South Africa vs group A runner-up match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"South Africa\",\"Namibia\",\"Sri Lanka\",\"United Arab Emirates\",\"Netherlands\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-07 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the Pakistan vs Bangladesh match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"Pakistan\",\"Bangladesh\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-07 04:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "What will be the result of the India vs group B winner match at the ICC Men's T20 World Cup Australia 2022 group phase?␟\"India\",\"Ireland\",\"Scotland\",\"West Indies\",\"Zimbabwe\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-07 08:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the semi-finals match between group 1 winner and group 2 runner-up at the ICC Men's T20 World Cup Australia 2022?␟\"Ireland\",\"Scotland\",\"West Indies\",\"Zimbabwe\",\"Namibia\",\"Sri Lanka\",\"United Arab Emirates\",\"Netherlands\",\"Afghanistan\",\"Australia\",\"England\",\"New Zealand\",\"Bangladesh\",\"India\",\"Pakistan\",\"South Africa\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-11 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the semi-finals match between group 1 runner-up and group 2 winner at the ICC Men's T20 World Cup Australia 2022?␟\"Ireland\",\"Scotland\",\"West Indies\",\"Zimbabwe\",\"Namibia\",\"Sri Lanka\",\"United Arab Emirates\",\"Netherlands\",\"Afghanistan\",\"Australia\",\"England\",\"New Zealand\",\"Bangladesh\",\"India\",\"Pakistan\",\"South Africa\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-11 00:00:00 UTC")
    },
    {
      templateID: 2, 
      question: "Who will win the ICC Men's T20 World Cup Australia 2022?␟\"Ireland\",\"Scotland\",\"West Indies\",\"Zimbabwe\",\"Namibia\",\"Sri Lanka\",\"United Arab Emirates\",\"Netherlands\",\"Afghanistan\",\"Australia\",\"England\",\"New Zealand\",\"Bangladesh\",\"India\",\"Pakistan\",\"South Africa\",\"Tied\",\"No Result\"␟cricket␟en_US", 
      openingTS: toTimestamp("2022-11-14 08:00:00 UTC")
    },
  ],
  prizeWeights: [6000, 3000, 1000]
};

async function main() {
  const chainId = hre.network.config.chainId;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Chain Id:", chainId);

  const chainConfig = getChain(chainId);

  const orderedQuestions = orderQuestions(
    marketData,
    timeout,
    chainConfig.arbitrator,
    chainConfig.realityEth,
    chainConfig.factory
  );

  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.attach(chainConfig.factory);
  await marketFactory.createMarket(
    marketData.marketName,
    marketData.marketSymbol,
    marketData.creator,
    marketData.creatorFee,
    marketData.closingTime,
    marketData.price,
    marketData.minBond,
    orderedQuestions,
    marketData.prizeWeights
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });