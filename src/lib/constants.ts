import { Address } from 'viem';

export type Token = {
  name: string;
  address: Address;
  symbol: string;
  decimals: number;
  chainId: number;
  logoURI: string;
};

// Tokens para Monad Testnet - Official addresses from docs.monad.xyz
export const MONAD_TOKENS: Token[] = [
  {
    chainId: 10143,
    name: "Monad",
    symbol: "MON",
    decimals: 18,
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Native token
    logoURI: "https://assets.coingecko.com/coins/images/34503/small/monad.jpg",
  },
  {
    chainId: 10143,
    name: "Wrapped Monad",
    symbol: "WMON",
    decimals: 18,
    address: "0x760afe86e5de5fa0ee542fc7b7b713e1c5425701",
    logoURI: "https://assets.coingecko.com/coins/images/34503/small/monad.jpg",
  },
  {
    chainId: 10143,
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
  },
  {
    chainId: 10143,
    name: "Wrapped Ethereum",
    symbol: "WETH",
    decimals: 18,
    address: "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
  {
    chainId: 10143,
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png",
  },
  {
    chainId: 10143,
    name: "Wrapped Bitcoin",
    symbol: "WBTC",
    decimals: 8,
    address: "0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png",
  },
];

// Mapeo por símbolo
export const MONAD_TOKENS_BY_SYMBOL: { [symbol: string]: Token } = 
  MONAD_TOKENS.reduce((acc, token) => {
    acc[token.symbol.toLowerCase()] = token;
    return acc;
  }, {} as { [symbol: string]: Token });

// Mapeo por dirección
export const MONAD_TOKENS_BY_ADDRESS: { [address: string]: Token } = 
  MONAD_TOKENS.reduce((acc, token) => {
    acc[token.address] = token;
    return acc;
  }, {} as { [address: string]: Token });

// Configuración para fees
export const AFFILIATE_FEE = "100"; // 1%
export const FEE_RECIPIENT = "0x1234567890123456789012345678901234567890"; // Replace with your address
export const MAX_ALLOWANCE = "115792089237316195423570985008687907853269984665640564039457584007913129639935";