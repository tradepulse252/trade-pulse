/** Map futures contract names to canonical market-data symbols */
const SYMBOL_ALIASES: Record<string, string> = {
  '1000SATS': 'SATS',
  '1000PEPE': 'PEPE',
  '1000SHIB': 'SHIB',
  '1000BONK': 'BONK',
  '1000FLOKI': 'FLOKI',
  '1000LUNC': 'LUNC',
  '1000XEC': 'XEC',
  '1000RATS': 'RATS',
  '1000CAT': 'CAT',
  '1000CHEEMS': 'CHEEMS',
  '1000WHY': 'WHY',
  BTCDOM: 'BTC',
  SHIB1000: 'SHIB',
  LUNA2: 'LUNA',
  DODOX: 'DODO',
  RONIN: 'RON',
  BEAMX: 'BEAM',
  NEIROETH: 'NEIRO',
};

/** CoinGecko coin IDs for reliable market-cap lookup (avoids symbol collisions) */
export const COINGECKO_ID_BY_SYMBOL: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  LINK: 'chainlink',
  MATIC: 'matic-network',
  POL: 'matic-network',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  BCH: 'bitcoin-cash',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  PEPE: 'pepe',
  SHIB: 'shiba-inu',
  BONK: 'bonk',
  FLOKI: 'floki',
  WIF: 'dogwifcoin',
  SUI: 'sui',
  SEI: 'sei-network',
  TIA: 'celestia',
  INJ: 'injective-protocol',
  FET: 'fetch-ai',
  RENDER: 'render-token',
  FIL: 'filecoin',
  ICP: 'internet-computer',
  HBAR: 'hedera-hashgraph',
  VET: 'vechain',
  ALGO: 'algorand',
  EOS: 'eos',
  XLM: 'stellar',
  TRX: 'tron',
  TON: 'the-open-network',
  STX: 'blockstack',
  IMX: 'immutable-x',
  GRT: 'the-graph',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  AXS: 'axie-infinity',
  AAVE: 'aave',
  MKR: 'maker',
  CRV: 'curve-dao-token',
  SNX: 'havven',
  COMP: 'compound-governance-token',
  LDO: 'lido-dao',
  RUNE: 'thorchain',
  PENDLE: 'pendle',
  ENA: 'ethena',
  WLD: 'worldcoin-wld',
  JUP: 'jupiter-exchange-solana',
  STRK: 'starknet',
  ZRO: 'layerzero',
  NOT: 'notcoin',
  PEOPLE: 'constitutiondao',
  ORDI: 'ordi',
  SATS: 'sats-ordinals',
  RATS: 'rats',
  BOME: 'book-of-meme',
  ETHFI: 'ether-fi',
  EIGEN: 'eigenlayer',
  CAKE: 'pancakeswap-token',
  XTZ: 'tezos',
  EGLD: 'elrond-erd-2',
  FLOW: 'flow',
  KAVA: 'kava',
  ROSE: 'oasis-network',
  ZEC: 'zcash',
  DASH: 'dash',
  XMR: 'monero',
  ETC: 'ethereum-classic',
  THETA: 'theta-token',
  KAS: 'kaspa',
  ONG: 'ontology',
  ONT: 'ontology',
  ZIL: 'zilliqa',
  ONE: 'harmony',
  CELO: 'celo',
  MINA: 'mina-protocol',
  KSM: 'kusama',
  GMT: 'stepn',
  GALA: 'gala',
  ENJ: 'enjincoin',
  CHZ: 'chiliz',
  HOT: 'holotoken',
  BAT: 'basic-attention-token',
  ZRX: '0x',
  SUSHI: 'sushi',
  '1INCH': '1inch',
  YFI: 'yearn-finance',
  DYDX: 'dydx',
  BLUR: 'blur',
  AR: 'arweave',
  QNT: 'quant-network',
  RPL: 'rocket-pool',
  PYTH: 'pyth-network',
  JTO: 'jito-governance-token',
  TAO: 'bittensor',
  W: 'wormhole',
  TNSR: 'tensor',
  OMNI: 'omni-network',
  REZ: 'renzo',
  IO: 'io-net',
  ZK: 'zksync',
  LISTA: 'lista-dao',
  BANANA: 'banana-gun',
  DOGS: 'dogs-2',
  NEIRO: 'neiro-3',
  POLYX: 'polymesh',
  RON: 'ronin',
  BEAM: 'beam-2',
  DODO: 'dodo',
  LUNA: 'terra-luna-2',
  LUNC: 'terra-luna',
  CHEEMS: 'cheems-token',
};

/** Resolve a futures baseAsset to the symbol used by market-data APIs */
export function normalizeMarketSymbol(baseAsset: string): string {
  let s = baseAsset.toUpperCase().replace(/USDT$/, '');
  if (SYMBOL_ALIASES[s]) return SYMBOL_ALIASES[s];
  if (s.startsWith('1000')) s = s.slice(4);
  return s;
}

/** Keys to try when looking up market meta for a baseAsset */
export function marketSymbolLookupKeys(baseAsset: string): string[] {
  const upper = baseAsset.toUpperCase().replace(/USDT$/, '');
  const normalized = normalizeMarketSymbol(baseAsset);
  return [...new Set([upper, normalized])];
}

export function coingeckoIdForSymbol(symbol: string): string | undefined {
  const normalized = normalizeMarketSymbol(symbol);
  return COINGECKO_ID_BY_SYMBOL[normalized];
}

export function coingeckoIdsForSymbols(symbols: string[]): string[] {
  const ids = new Set<string>();
  for (const sym of symbols) {
    const id = coingeckoIdForSymbol(sym);
    if (id) ids.add(id);
  }
  return [...ids];
}
