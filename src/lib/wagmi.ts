import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

export const monad = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
    public: {
      http: ['https://rpc.ankr.com/monad_testnet'],
    },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: 'Monad 0x Swap dApp',
  projectId: 'your_project_id', // Get this from WalletConnect Cloud
  chains: [monad],
  ssr: true,
});