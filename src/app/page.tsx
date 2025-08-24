'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import { Toaster } from 'sonner';
import { useAccount, useChainId } from 'wagmi';

import { config } from '@/lib/wagmi';
import SwapErc20Modal from '@/components/web3/SwapErc20Modal';
import SwitchChainModal from '@/components/web3/SwitchChainModal';

import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

function DAppContent() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-400 to-pink-400 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Monad 0x Swap
            </h1>
            <p className="text-gray-600">
              Token swap powered by 0x API on Monad testnet
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-center">
              <ConnectButton />
            </div>
            
            {isConnected && (
              <div className="space-y-3">
                {chainId === 10143 ? (
                  <SwapErc20Modal userAddress={address} />
                ) : (
                  <SwitchChainModal
                    buttonText="Switch to Monad Testnet"
                    requiredChainId={10143}
                  />
                )}
              </div>
            )}
            
            {!isConnected && (
              <div className="text-center text-gray-500 py-4">
                Connect your wallet to start swapping tokens
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <DAppContent />
          <Toaster position="top-right" />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}