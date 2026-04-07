const KEYWORD_RULES = {
  fed: [
    "federal reserve","fed rate","fomc","powell","interest rate","rate cut","rate hike",
    "balance sheet","quantitative","tasa federal","reserva federal","jerome",
    "inflation target","monetary policy","basis points","bps",
  ],
  whitehouse: [
    "trump","white house","casa blanca","executive order","tariff","tariffs","trade war",
    "sanction","biden","administration","congress","senate","president",
    "election","oval office","secretary","treasury","department of",
  ],
  macro: [
    "s&p","s&p 500","nasdaq","dow jones","unemployment","desempleo","cpi","pce","gdp",
    "pib","inflation","inflacion","recession","recesion","nonfarm","payroll",
    "jobs report","retail sales","consumer confidence","housing","pmi","ism",
    "yield curve","10-year","treasury yield","dollar index","dxy","earnings",
    "quarterly results","ipo","market crash","correction",
  ],
  geopolitical: [
    "war","guerra","conflict","conflicto","ukraine","russia","china","taiwan","iran",
    "israel","middle east","nato","sanctions","embargo","coup","election","protest",
    "missile","nuclear","geopolit","trade deal","g7","g20","imf","world bank",
    "crude oil","petróleo","opec",
  ],
  fed_live: [
    "powell speaks","powell speech","fomc meeting","fomc press","fed press conference",
    "fed decision","rate decision",
  ],
  whitehouse_live: [
    "trump speaks","trump speech","press briefing","white house briefing",
    "executive order signed","trump signs",
  ],
  defi: [
    "defi","dex","uniswap","aave","curve","compound","liquidity","yield","tvl","amm",
    "lending protocol","borrow","collateral","staking","vault",
  ],
  protocol: [
    "bitcoin","ethereum","solana","layer 2","upgrade","fork","mainnet","testnet","deploy",
    "protocol","blockchain","consensus","eip","bip","update","launch","v2","v3",
    "hard fork","soft fork","merge","shanghai","dencun",
  ],
  market: [
    "price","rally","dump","bull","bear","ath","btc","eth","altcoin","futures","spot",
    "liquidation","long","short","funding rate","open interest","volume","market cap",
  ],
};

const LIVE_KEYWORDS = [
  "live","en vivo","breaking","en directo","speaks now","is speaking",
  "press conference","briefing","fomc statement","rate decision",
];

export function classifyArticle(title, defaultCat) {
  const tl = title.toLowerCase();
  const isLive = LIVE_KEYWORDS.some(k => tl.includes(k));

  if (KEYWORD_RULES.fed_live.some(k => tl.includes(k))) return { category: "fed", isLive: true };
  if (KEYWORD_RULES.whitehouse_live.some(k => tl.includes(k))) return { category: "whitehouse", isLive: true };

  for (const cat of ["fed","whitehouse","macro","geopolitical","defi","protocol","market"]) {
    if ((KEYWORD_RULES[cat] || []).some(k => tl.includes(k))) {
      return { category: cat, isLive };
    }
  }
  return { category: defaultCat, isLive };
}

export const CAT_LABELS = {
  market:      { label: "Mercado",        style: "neutral" },
  defi:        { label: "DeFi",           style: "neutral" },
  protocol:    { label: "Protocolo",      style: "neutral" },
  fed:         { label: "Fed / Powell",   style: "yellow" },
  whitehouse:  { label: "Casa Blanca",    style: "yellow" },
  macro:       { label: "Macro / Índices",style: "red" },
  geopolitical:{ label: "Geopolítica",    style: "red" },
};

export const NEWS_SOURCES = [
  { url: "https://es.cointelegraph.com/rss",               name: "CoinTelegraph ES",   defaultCat: "market" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", name: "CoinDesk",           defaultCat: "market" },
  { url: "https://decrypt.co/feed",                        name: "Decrypt",            defaultCat: "market" },
  { url: "https://bitcoinmagazine.com/.rss/full/",         name: "Bitcoin Magazine",   defaultCat: "protocol" },
  { url: "https://cryptoslate.com/feed/",                  name: "CryptoSlate",        defaultCat: "defi" },
  { url: "https://thedefiant.io/feed",                     name: "The Defiant",        defaultCat: "defi" },
  { url: "https://www.dlnews.com/rss.xml",                 name: "DL News",            defaultCat: "market" },
  { url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",  name: "WSJ Markets",        defaultCat: "macro" },
  { url: "https://feeds.reuters.com/reuters/businessNews",  name: "Reuters Business",   defaultCat: "macro" },
  { url: "https://www.cnbc.com/id/20910258/device/rss/rss.html", name: "CNBC Economy", defaultCat: "macro" },
  { url: "https://feeds.reuters.com/Reuters/PoliticsNews",  name: "Reuters Politics",   defaultCat: "whitehouse" },
  { url: "https://rss.politico.com/politics-news.xml",      name: "Politico",           defaultCat: "whitehouse" },
  { url: "https://feeds.reuters.com/reuters/worldNews",     name: "Reuters World",      defaultCat: "geopolitical" },
  { url: "http://feeds.bbci.co.uk/news/world/rss.xml",      name: "BBC World",          defaultCat: "geopolitical" },
];