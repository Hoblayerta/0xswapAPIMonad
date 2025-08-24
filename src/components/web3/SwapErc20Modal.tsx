'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLinkIcon } from 'lucide-react';

import { PriceResponse, QuoteResponse } from '../../../types/index';
import {
  useBalance,
  useChainId,
  useReadContract,
  useSendTransaction,
  useSignTypedData,
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWalletClient,
  useWriteContract,
} from 'wagmi';
import {
  Address,
  concat,
  erc20Abi,
  formatUnits,
  Hex,
  numberToHex,
  parseUnits,
  size,
  zeroAddress,
} from 'viem';
import qs from 'qs';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  AFFILIATE_FEE,
  FEE_RECIPIENT,
  MAX_ALLOWANCE,
  MONAD_TOKENS,
  MONAD_TOKENS_BY_SYMBOL,
  Token,
} from '@/lib/constants';
import { toast } from 'sonner';

type SwapErc20ModalProps = {
  userAddress: `0x${string}` | undefined;
};

export default function SwapErc20Modal({ userAddress }: SwapErc20ModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [sellToken, setSellToken] = useState('mon');
  const [sellAmount, setSellAmount] = useState('');
  const [buyToken, setBuyToken] = useState('usdc');
  const [buyAmount, setBuyAmount] = useState('');
  const [price, setPrice] = useState<PriceResponse | undefined>();
  const [quote, setQuote] = useState<QuoteResponse | undefined>();
  const [finalize, setFinalize] = useState(false);
  const [tradeDirection, setSwapDirection] = useState('sell');
  const [error, setError] = useState<any[]>([]);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [buyTokenTax, setBuyTokenTax] = useState({
    buyTaxBps: '0',
    sellTaxBps: '0',
  });
  const [sellTokenTax, setSellTokenTax] = useState({
    buyTaxBps: '0',
    sellTaxBps: '0',
  });

  const chainId = useChainId() || 10143;

  const tokensByChain = (chainId: number) => {
    if (chainId === 10143) {
      return MONAD_TOKENS_BY_SYMBOL;
    }
    return MONAD_TOKENS_BY_SYMBOL;
  };

  const sellTokenObject = tokensByChain(chainId)[sellToken];
  const buyTokenObject = tokensByChain(chainId)[buyToken];

  const sellTokenDecimals = sellTokenObject?.decimals || 18;
  const buyTokenDecimals = buyTokenObject?.decimals || 18;

  const parsedSellAmount =
    sellAmount && tradeDirection === 'sell'
      ? parseUnits(sellAmount, sellTokenDecimals).toString()
      : undefined;

  const parsedBuyAmount =
    buyAmount && tradeDirection === 'buy'
      ? parseUnits(buyAmount, buyTokenDecimals).toString()
      : undefined;

  const handleSellTokenChange = (value: string) => {
    setSellToken(value);
  };

  function handleBuyTokenChange(value: string) {
    setBuyToken(value);
  }

  function handleSwap(event: React.FormEvent) {
    event?.preventDefault();
    toast.warning('conectar funcionalidad de swap');
  }

  useEffect(() => {
    if (!isMounted) {
      setIsMounted(true);
    }
  }, [isMounted]);

  useEffect(() => {
    if (!sellTokenObject || !buyTokenObject || !sellAmount || sellAmount === '' || !userAddress) {
      setBuyAmount('');
      setPrice(undefined);
      return;
    }

    const controller = new AbortController();
    
    const params = {
      chainId: '10143',
      sellToken: sellTokenObject.address,
      buyToken: buyTokenObject.address,
      sellAmount: parsedSellAmount,
      taker: userAddress,
      swapFeeRecipient: FEE_RECIPIENT,
      swapFeeBps: AFFILIATE_FEE,
      swapFeeToken: buyTokenObject.address,
      tradeSurplusRecipient: FEE_RECIPIENT,
    };

    async function fetchPrice() {
      try {
        setIsLoadingPrice(true);
        setError([]);
        
        const response = await fetch(`/api/price?${qs.stringify(params)}`, {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (controller.signal.aborted) return;
        
        console.log('Price data:', data);

        if (data?.error) {
          setError([data.error]);
          setBuyAmount('');
          setPrice(undefined);
          return;
        }

        if (data?.validationErrors?.length > 0) {
          setError(data.validationErrors);
          setBuyAmount('');
          setPrice(undefined);
        } else {
          setError([]);
          if (data.buyAmount) {
            setBuyAmount(formatUnits(data.buyAmount, buyTokenObject.decimals));
            setPrice(data);
          }
          if (data?.tokenMetadata) {
            setBuyTokenTax(data.tokenMetadata.buyToken || { buyTaxBps: '0', sellTaxBps: '0' });
            setSellTokenTax(data.tokenMetadata.sellToken || { buyTaxBps: '0', sellTaxBps: '0' });
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('Error fetching price:', error);
        setError([error.message || 'Error fetching price']);
        setBuyAmount('');
        setPrice(undefined);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingPrice(false);
        }
      }
    }

    const timeoutId = setTimeout(fetchPrice, 500); // Debounce API calls

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    sellTokenObject?.address,
    buyTokenObject?.address,
    parsedSellAmount,
    userAddress,
    sellAmount
  ]);

  const { data } = useBalance({
    address: userAddress,
    token: sellTokenObject?.address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" 
      ? undefined 
      : sellTokenObject?.address,
  });

  console.log('taker sellToken balance: ', data);

  const inSufficientBalance =
    data && sellAmount
      ? parseUnits(sellAmount, sellTokenDecimals) > data.value
      : true;

  const formatTax = (taxBps: string) => (parseFloat(taxBps) / 100).toFixed(2);

  return (
    <Dialog>
      <DialogTrigger asChild className="w-full">
        <Button>Swap ERC20</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">Swap ERC20</DialogTitle>
          <DialogDescription>
            La cantidad ingresada será intercambiada por la cantidad de tokens
            mostrada en la segunda fila
          </DialogDescription>
        </DialogHeader>
        {isMounted ? (
          <div className="w-full">
            <form
              className="flex flex-col w-full gap-y-8"
              onSubmit={handleSwap}
            >
              <div className="w-full flex flex-col gap-y-4">
                <div className="w-full flex items-center gap-1.5">
                  {sellTokenObject && (
                    <Image
                      alt={sellToken}
                      className="h-9 w-9 mr-2 rounded-md"
                      src={MONAD_TOKENS_BY_SYMBOL[sellToken].logoURI}
                      width={36}
                      height={36}
                    />
                  )}
                  <Select
                    onValueChange={handleSellTokenChange}
                    defaultValue="mon"
                  >
                    <SelectTrigger className="w-1/4">
                      <SelectValue placeholder="Vender" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONAD_TOKENS.map((token: Token) => {
                        return (
                          <SelectItem
                            key={token.address}
                            value={token.symbol.toLowerCase()}
                          >
                            {token.symbol}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-3/4"
                    type="number"
                    name="sell-amount"
                    id="sell-amount"
                    placeholder="Ingresa cantidad..."
                    required
                    onChange={(event) => {
                      setSwapDirection('sell');
                      setSellAmount(event.target.value);
                    }}
                  />
                </div>
                <div className="w-full flex items-center gap-1.5">
                  {buyTokenObject && (
                    <Image
                      alt={buyToken}
                      className="h-9 w-9 mr-2 rounded-md"
                      src={MONAD_TOKENS_BY_SYMBOL[buyToken].logoURI}
                      width={36}
                      height={36}
                    />
                  )}
                  <Select
                    onValueChange={handleBuyTokenChange}
                    defaultValue="usdc"
                  >
                    <SelectTrigger className="w-1/4">
                      <SelectValue placeholder="Comprar" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONAD_TOKENS.map((token: Token) => {
                        return (
                          <SelectItem
                            key={token.address}
                            value={token.symbol.toLowerCase()}
                          >
                            {token.symbol}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-3/4"
                    type="number"
                    id="buy-amount"
                    name="buy-amount"
                    value={isLoadingPrice ? 'Calculando...' : buyAmount}
                    placeholder={isLoadingPrice ? 'Calculando...' : 'Cantidad estimada...'}
                    disabled
                  />
                </div>
              </div>
              {error.length > 0 && (
                <div className="text-red-500 text-sm">
                  {error.map((err, index) => (
                    <div key={index}>{typeof err === 'string' ? err : err.message || 'Error desconocido'}</div>
                  ))}
                </div>
              )}
              {finalize && price ? (
                <ConfirmSwapButton
                  userAddress={userAddress as `0x${string}`}
                  price={price}
                  quote={quote}
                  setQuote={setQuote}
                  setFinalize={setFinalize}
                />
              ) : (
                <ApproveOrReviewButton
                  sellTokenAddress={MONAD_TOKENS_BY_SYMBOL[sellToken]?.address}
                  userAddress={userAddress as `0x${string}`}
                  onClick={() => setFinalize(true)}
                  disabled={inSufficientBalance || isLoadingPrice || !price}
                  price={price}
                  isLoading={isLoadingPrice}
                />
              )}
            </form>
          </div>
        ) : (
          <p>Cargando...</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ApproveOrReviewButton({
  userAddress,
  onClick,
  sellTokenAddress,
  disabled,
  price,
  isLoading,
}: {
  userAddress: Address;
  onClick: () => void;
  sellTokenAddress: Address;
  disabled?: boolean;
  price: any;
  isLoading?: boolean;
}) {
  const spender = (price?.issues?.allowance?.spender ??
    zeroAddress) as `0x${string}`;

  const { data: allowance, refetch } = useReadContract({
    address: sellTokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [userAddress, spender],
    query: {
      enabled: !!sellTokenAddress && 
               !!userAddress && 
               !!spender && 
               spender !== zeroAddress &&
               sellTokenAddress !== "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Skip for native token
    },
  });

  const { data } = useSimulateContract({
    address: sellTokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, BigInt(MAX_ALLOWANCE)],
    query: {
      enabled: sellTokenAddress !== "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Skip for native token
    },
  });

  const {
    data: writeContractResult,
    writeContractAsync,
    error,
  } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: writeContractResult,
  });

  async function onClickHandler(event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();

    try {
      await writeContractAsync({
        abi: erc20Abi,
        address: sellTokenAddress,
        functionName: 'approve',
        args: [spender, BigInt(MAX_ALLOWANCE)],
      });
      refetch();
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (data) {
      refetch();
    }
  }, [data, refetch]);

  if (isLoading) {
    return (
      <Button disabled>
        Calculando precio...
      </Button>
    );
  }

  // For native tokens (MON), skip allowance check entirely
  if (sellTokenAddress === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
    return (
      <Button
        disabled={disabled}
        onClick={() => {
          onClick();
        }}
      >
        {disabled ? 'Balance Insuficiente' : 'Revisar Trade'}
      </Button>
    );
  }

  if (price?.issues?.allowance === null) {
    return (
      <Button
        disabled={disabled}
        onClick={() => {
          onClick();
        }}
      >
        {disabled ? 'Balance Insuficiente' : 'Revisar Trade'}
      </Button>
    );
  }

  if (error) {
    return <div>Algo salió mal: {error.message}</div>;
  }

  if (allowance === 0n && !disabled) {
    return (
      <>
        <Button onClick={onClickHandler}>
          {isApproving ? 'Aprobando…' : 'Aprobar'}
        </Button>
      </>
    );
  }

  return (
    <Button
      disabled={disabled}
      onClick={() => {
        onClick();
      }}
    >
      {disabled ? 'Balance Insuficiente' : 'Revisar Trade'}
    </Button>
  );
}

function ConfirmSwapButton({
  userAddress,
  price,
  quote,
  setQuote,
  setFinalize,
}: {
  userAddress: Address | undefined;
  price: PriceResponse;
  quote: QuoteResponse | undefined;
  setQuote: (price: any) => void;
  setFinalize: (value: boolean) => void;
}) {
  const { signTypedDataAsync } = useSignTypedData();
  const { data: walletClient } = useWalletClient();
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress || !price.sellToken || !price.buyToken || !price.sellAmount) return;

    const controller = new AbortController();
    
    const params = {
      chainId: '10143',
      sellToken: price.sellToken,
      buyToken: price.buyToken,
      sellAmount: price.sellAmount,
      taker: userAddress,
      swapFeeRecipient: FEE_RECIPIENT,
      swapFeeBps: AFFILIATE_FEE,
      swapFeeToken: price.buyToken,
      tradeSurplusRecipient: FEE_RECIPIENT,
    };

    async function fetchQuote() {
      try {
        setIsLoadingQuote(true);
        setQuoteError(null);
        
        const response = await fetch(`/api/quote?${qs.stringify(params)}`, {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`Quote API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (controller.signal.aborted) return;
        
        console.log('Quote data:', data);
        
        if (data?.error) {
          throw new Error(data.error);
        }
        
        setQuote(data);
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('Error fetching quote:', error);
        setQuoteError(error.message || 'Error obteniendo cotización');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingQuote(false);
        }
      }
    }
    
    fetchQuote();
    
    return () => {
      controller.abort();
    };
  }, [
    price.sellToken,
    price.buyToken,
    price.sellAmount,
    userAddress,
    setQuote,
  ]);

  const { data: hash, isPending, sendTransaction } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  if (isLoadingQuote) {
    return <div>Obteniendo mejor cotización...</div>;
  }
  
  if (quoteError) {
    return (
      <div className="flex flex-col gap-y-2">
        <div className="text-red-500 text-sm">Error: {quoteError}</div>
        <Button
          variant="ghost"
          onClick={(event) => {
            event.preventDefault();
            setFinalize(false);
          }}
        >
          Volver
        </Button>
      </div>
    );
  }
  
  if (!quote) {
    return <div>Obteniendo mejor cotización...</div>;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <Button
        variant="ghost"
        onClick={(event) => {
          event.preventDefault();
          setFinalize(false);
        }}
      >
        Modificar swap
      </Button>
      <Button
        disabled={isPending}
        onClick={async (event) => {
          event.preventDefault();

          console.log('enviando cotización a blockchain');

          if (quote.permit2?.eip712) {
            let signature: Hex | undefined;
            try {
              signature = await signTypedDataAsync(quote.permit2.eip712);
              console.log('Firmado mensaje permit2');
            } catch (error) {
              console.error('Error firmando permit2:', error);
            }

            if (signature && quote?.transaction?.data) {
              const signatureLengthInHex = numberToHex(size(signature), {
                signed: false,
                size: 32,
              });

              const transactionData = quote.transaction.data as Hex;
              const sigLengthHex = signatureLengthInHex as Hex;
              const sig = signature as Hex;

              quote.transaction.data = concat([
                transactionData,
                sigLengthHex,
                sig,
              ]);
            } else {
              throw new Error('Falló obtener firma o datos de transacción');
            }
          }

          if (sendTransaction) {
            sendTransaction({
              account: walletClient?.account.address,
              gas: !!quote?.transaction.gas
                ? BigInt(quote?.transaction.gas)
                : undefined,
              to: quote?.transaction.to as `0x${string}`,
              data: quote.transaction.data as `0x${string}`,
              value: quote?.transaction.value
                ? BigInt(quote.transaction.value)
                : undefined,
              chainId: 10143,
            });
          }
        }}
      >
        {isPending ? 'Confirmando...' : 'Colocar Orden'}
      </Button>
      {hash && (
        <div className="pt-4 flex flex-col items-center">
          <Link
            className="hover:text-accent flex items-center gap-x-1.5"
            href={`https://testnet.monadexplorer.com/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver tx en explorador <ExternalLinkIcon className="h-4 w-4" />
          </Link>
          {isConfirming && <div>Esperando confirmación...</div>}
          {isConfirmed && <div>Transacción confirmada.</div>}
        </div>
      )}
    </div>
  );
}