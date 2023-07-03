const ethers = hre.ethers;

// ----  V2  ----

function buildQuestionHomevsAwayV2(team1, team2, market, openingTS) {
  return {
    templateID: 2,
    openingTS: openingTS,
    title: `What will be the result of the ${team1} vs ${team2} match at ${market}?`,
    outcomes: JSON.stringify([team1, team2, 'Draw']).replace(/^\[/, '').replace(/\]$/, ''),
    category: 'football',
    language: 'en_US'
  };
}

function buildQuestionSingleSelectV2(question, answers, openingTS, category) {
  return {
    templateID: 2,
    openingTS: openingTS,
    title: question,
    outcomes: JSON.stringify(answers).replace(/^\[/, '').replace(/\]$/, ''),
    category: category,
    language: 'en_US'
  };
}

function buildQuestionMultipleSelectV2(question, answers, openingTS, category) {
  return {
    templateID: 3,
    openingTS: openingTS,
    title: question,
    outcomes: JSON.stringify(answers).replace(/^\[/, '').replace(/\]$/, ''),
    category: category,
    language: 'en_US'
  };
}

function buildQuestionPositionV2(position, answers, market, openingTS) {
  return {
    templateID: 2,
    openingTS: openingTS,
    title: `Who will finish in the position #${position} at ${market} race?`,
    outcomes: JSON.stringify(answers).replace(/^\[/, '').replace(/\]$/, ''),
    category: 'F1',
    language: 'en_US'
  };
}

function buildQuestionTeamMostPointsV2(answers, market, openingTS) {
  return {
    templateID: 3,
    openingTS: openingTS,
    title: `Which team will earn more points at ${market}?`,
    outcomes: JSON.stringify(answers).replace(/^\[/, '').replace(/\]$/, ''),
    category: 'F1',
    language: 'en_US'
  };
}

// ----  V1  ----
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

function buildQuestionMultipleSelect(question, answers, openingTS, category) {
  return {
    templateID: 3,
    question: encodeQuestionText('multiple-select', question, answers, category, 'en_US'),
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
    templateID: 3,
    question: encodeQuestionText('multiple-select', `Which team will earn more points at ${market}?`, answers, 'F1', 'en_US'),
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

function encodeQuestionTextV2(
  templateId/*: numer*/,
  txt/*: string*/,
  outcomes/*: string[]*/,
  category/*: string*/,
  lang/*?: string*/
) {
  let qText = JSON.stringify(txt).replace(/^"|"$/g, '');
  const delim = '\u241f';
  //console.log('using template_id', template_id);
  if (templateId == 2 || templateId == 3) {
    qText = qText + delim + outcomes;
    //console.log('made qtext', qtext);
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

function orderQuestionsV2(marketData, timeout, arbitrator, realityEth, factory) {
  return marketData.questions
    .sort((a, b) => getQuestionID(
      a.templateID,
      a.openingTS,
      encodeQuestionTextV2(a.templateID, a.title, a.outcomes, a.category, a.language),
      arbitrator,
      timeout,
      marketData.minBond,
      realityEth,
      factory,
    ) > getQuestionID(
      b.templateID,
      b.openingTS,
      encodeQuestionTextV2(b.templateID, b.title, b.outcomes, b.category, b.language),
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
    factory: "0x67d3673CF19a6b0Ad70D76b4e9C6f715177eb48b",
    factoryV2: "0x364Bc6fCdF1D2Ce014010aB4f479a892a8736014",
    keyvalue: "0x47c255d92f6e800312835f08f7906bc9019a210c",
    realityRegistry: "0xad3aa4da922ab968d8e9733ecf32699756970193",
    liquidityFactory: "0x6bbe06d775445f052b9684d98f80161921e67d2a"
  },
  31337: {
    arbitrator: "0x29F39dE98D750eb77b5FAfb31B2837f079FcE222",
    realityEth: "0xE78996A233895bE74a66F451f1019cA9734205cc",
    factory: "0x67d3673CF19a6b0Ad70D76b4e9C6f715177eb48b"
  },
  80001: {
    factory: "0xfe6bd7451e92deddd1096430e659e8af882d2eb7",
    factoryV2: "0xF25455008BD7a750EBFeEC73d4E64114dA9449F5",
    realityEth: "0x92115220C28e78312cCe86f3d1dE652CFBD0357A",
    arbitrator: "0x92115220C28e78312cCe86f3d1dE652CFBD0357A",
    keyvalue: "0xE680Dc6A28674546361531BF4CaaE190E08D6Bad",
    liquidityFactory: "0x7e0a4b5514a47e0810ae230be7909e898ffe99ac",
    realityRegistry: "0xfda70aee5616ead5220102bf75b57135dfe35e55"
  }
};

function getChain(chainId) {
  if (!params[chainId]) {
    console.log(`Invalid chainId "${String(chainId)}", using 31337`);
    chainId = 31337;
  }

  return params[chainId];
}


const SOCCER_MATCH_DURATION = 60*60*2;
const TENNIS_MATCH_DURATION = 60*60*5;
const F1_RACE_DURATION = 60*60*2;

module.exports = {
  buildQuestionHomevsAway,
  buildQuestionPosition,
  buildQuestionTeamMostPoints,
  buildQuestionSingleSelect,
  buildQuestionMultipleSelect,
  buildQuestionHomevsAwayV2,
  buildQuestionPositionV2,
  buildQuestionTeamMostPointsV2,
  buildQuestionSingleSelectV2,
  buildQuestionMultipleSelectV2,
  toTimestamp,
  encodeQuestionText,
  getQuestionID,
  orderQuestions,
  orderQuestionsV2,
  getChain,
  SOCCER_MATCH_DURATION,
  TENNIS_MATCH_DURATION,
  F1_RACE_DURATION
}