const ethers = hre.ethers;

function buildQuestionHomevsAway(team1, team2, market, openingTS) {
  return {
    templateID: 2,
    question: encodeQuestionText('single-select', `What will be the result of the ${team1} vs ${team2} match at ${market}?`, [team1, team2, 'Draw'], 'football', 'en_US'),
    openingTS: openingTS
  };
}

function buildQuestionSingleSelect(question, answers, openingTS, category) {
  return {
    templateID: 2,
    question: encodeQuestionText('single-select', question, answers, category, 'en_US'),
    openingTS: openingTS
  };
}

function buildQuestionPosition(position, answers, market, openingTS) {
  return {
    templateID: 2,
    question: encodeQuestionText('single-select', `Who will finish in the position #${position} at ${market} race?`, answers, 'F1', 'en_US'),
    openingTS: openingTS
  };
}

function buildQuestionTeamMostPoints(answers, market, openingTS) {
  return {
    templateID: 2,
    question: encodeQuestionText('single-select', `Which team will earn more points at ${market}?`, answers, 'F1', 'en_US'),
    openingTS: openingTS
  };
}

function toTimestamp(strDate) {
  var datum = Date.parse(strDate);
  return datum / 1000;
}

function encodeQuestionText(
  qtype/*: 'bool' | 'single-select' | 'multiple-select' | 'uint' | 'datetime'*/,
  txt/*: string*/,
  outcomes/*: string[]*/,
  category/*: string*/,
  lang/*?: string*/
) {
  let qText = JSON.stringify(txt).replace(/^"|"$/g, '');
  const delim = '\u241f';
  //console.log('using template_id', template_id);
  if (qtype === 'single-select' || qtype === 'multiple-select') {
    const outcome_str = JSON.stringify(outcomes).replace(/^\[/, '').replace(/\]$/, '');
    //console.log('made outcome_str', outcome_str);
    qText = qText + delim + outcome_str;
    //console.log('made qtext', qtext);
  }
  if (typeof lang === 'undefined' || lang === '') {
    lang = 'en_US';
  }
  qText = qText + delim + category + delim + lang;
  return qText;
}

function getQuestionID(
  _templateID,
  _openingTS,
  _question,
  _arbitrator,
  _timeout,
  _minBond,
  _realitio,
  _factory
) {
  const contentHash = ethers.utils.solidityKeccak256(
    [ "uint256", "uint32", "string" ],
    [ _templateID, _openingTS, _question ]
  );
  const questionID = ethers.utils.solidityKeccak256(
    [ "bytes32", "address", "uint32", "uint256", "address", "address", "uint256" ],
    [ contentHash, _arbitrator, _timeout, _minBond, _realitio, _factory, 0 ]
  );
  return questionID;
}

function orderQuestions(marketData, timeout, arbitrator, realityEth, factory) {
  return marketData.questions
    .sort((a, b) => getQuestionID(
      a.templateID,
      a.openingTS,
      a.question,
      arbitrator,
      timeout,
      marketData.minBond,
      realityEth,
      factory,
    ) > getQuestionID(
      b.templateID,
      b.openingTS,
      b.question,
      arbitrator,
      timeout,
      marketData.minBond,
      realityEth,
      factory,
    ) ? 1 : -1)
}

const params = {
  42: {
    arbitrator: "0xDEd12537dA82C1019b3CA1714A5d58B7c5c19A04",
    realityEth: "0xcB71745d032E16ec838430731282ff6c10D29Dea",
    factory: ""
  },
  100: {
    arbitrator: "0x29F39dE98D750eb77b5FAfb31B2837f079FcE222",
    realityEth: "0xE78996A233895bE74a66F451f1019cA9734205cc",
    factory: "0x67d3673CF19a6b0Ad70D76b4e9C6f715177eb48b"
  },
  31337: {
    arbitrator: "0x29F39dE98D750eb77b5FAfb31B2837f079FcE222",
    realityEth: "0xE78996A233895bE74a66F451f1019cA9734205cc",
    factory: "0x67d3673CF19a6b0Ad70D76b4e9C6f715177eb48b"
  },
};

function getChain(chainId) {
  if (!params[chainId]) {
    console.log(`Invalid chainId "${String(chainId)}", using 31337`);
    chainId = 31337;
  }

  return params[chainId];
}

const SOCCER_MATCH_DURATION = 60*60*2.5;
const F1_RACE_DURATION = 60*60*3;

module.exports = {
  buildQuestionHomevsAway,
  buildQuestionPosition,
  buildQuestionTeamMostPoints,
  buildQuestionSingleSelect,
  toTimestamp,
  encodeQuestionText,
  getQuestionID,
  orderQuestions,
  getChain,
  SOCCER_MATCH_DURATION,
  F1_RACE_DURATION
}