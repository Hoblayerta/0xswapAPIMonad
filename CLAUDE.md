```markdown
# Tutorial Token Swap DApp con 0x API para Monad

Este tutorial te guiará para crear una aplicación descentralizada (dApp) de intercambio de tokens usando la 0x Swap API en la red Monad.

## Información de Red

- **Red**: Monad
- **Chain ID**: 10143  
- **Explorador**: https://monad.explorer
- **Soporte 0x**: ✅ Swap API disponible

## Prerequisitos

```bash
npm install wagmi viem @rainbow-me/rainbowkit
npm install shadcn-ui
npm install qs @types/qs
npm install sonner
```

## 1. Configuración de Constantes

Crear `/src/lib/constants.ts`:

```typescript
import { Address } from 'viem';

export type Token = {
  name: string;
  address: Address;
  symbol: string;
  decimals: number;
  chainId: number;
  logoURI: string;
};

// Tokens para Monad
export const MONAD_TOKENS: Token[] = [
  {
    chainId: 10143,
    name: "Wrapped Monad",
    symbol: "WMON",
    decimals: 18,
    address: "0x...", // Dirección del WMON en Monad
    logoURI: "https://raw.githubusercontent.com/monad-xyz/assets/main/wmon.png",
  },
  {
    chainId: 10143,
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0x...", // Dirección del USDC en Monad
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
  },
  {
    chainId: 10143,
    name: "Dai Stablecoin",
    symbol: "DAI",
    decimals: 18,
    address: "0x...", // Dirección del DAI en Monad
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png",
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
export const FEE_RECIPIENT = "0x..."; // Tu dirección para recibir fees
export const MAX_ALLOWANCE = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
```

## 2. Tipos TypeScript

Crear `/types/index.ts`:

```typescript
export interface PriceResponse {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  issues: {
    allowance: {
      actual: string;
      spender: string;
    } | null;
    balance: {
      token: string;
      actual: string;
      expected: string;
    } | null;
  };
  tokenMetadata: {
    buyToken: {
      buyTaxBps: string;
      sellTaxBps: string;
    };
    sellToken: {
      buyTaxBps: string;
      sellTaxBps: string;
    };
  };
}

export interface QuoteResponse extends PriceResponse {
  transaction: {
    to: string;
    data: string;
    gas: string;
    gasPrice: string;
    value: string;
  };
  permit2: {
    type: string;
    hash: string;
    eip712: any;
  };
}
```

## 3. API Routes

### Price Route: `/app/api/price/route.ts`

```typescript
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  try {
    const res = await fetch(
      `https://api.0x.org/swap/permit2/price?${searchParams}`,
      {
        headers: {
          '0x-api-key': process.env.NEXT_PUBLIC_ZEROEX_API_KEY as string,
          '0x-version': 'v2',
        },
      }
    );
    const data = await res.json();

    console.log(
      'price api',
      `https://api.0x.org/swap/permit2/price?${searchParams}`
    );

    console.log('price data', data);

    return Response.json(data);
  } catch (error) {
    console.log(error);
  }
}
```

### Quote Route: `/app/api/quote/route.ts`

```typescript
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  try {
    const res = await fetch(
      `https://api.0x.org/swap/permit2/quote?${searchParams}`,
      {
        headers: {
          '0x-api-key': process.env.NEXT_PUBLIC_ZEROEX_API_KEY as string,
          '0x-version': 'v2',
        },
      }
    );
    const data = await res.json();

    console.log('quote data', data);

    console.log(
      'quote api',
      `https://api.0x.org/swap/permit2/quote?${searchParams}`
    );

    return Response.json(data);
  } catch (error) {
    console.log(error);
  }
}
```

## 4. Componente Principal de Swap

Crear `/src/components/web3/SwapErc20Modal.tsx`:

```typescript
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
  const [sellToken, setSellToken] = useState('wmon');
  const [sellAmount, setSellAmount] = useState('');
  const [buyToken, setBuyToken] = useState('usdc');
  const [buyAmount, setBuyAmount] = useState('');
  const [price, setPrice] = useState<PriceResponse | undefined>();
  const [quote, setQuote] = useState<QuoteResponse | undefined>();
  const [finalize, setFinalize] = useState(false);
  const [tradeDirection, setSwapDirection] = useState('sell');
  const [error, setError] = useState([]);
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

  const sellTokenDecimals = sellTokenObject.decimals;
  const buyTokenDecimals = buyTokenObject.decimals;

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

  function handleSwap() {
    event?.preventDefault();
    toast.warning('conectar funcionalidad de swap');
  }

  useEffect(() => {
    if (!isMounted) {
      setIsMounted(true);
    }
  }, [isMounted]);

  useEffect(() => {
    const params = {
      chainId: '10143',
      sellToken: sellTokenObject.address,
      buyToken: buyTokenObject.address,
      sellAmount: parsedSellAmount,
      buyAmount: parsedBuyAmount,
      taker: userAddress,
      swapFeeRecipient: FEE_RECIPIENT,
      swapFeeBps: AFFILIATE_FEE,
      swapFeeToken: buyTokenObject.address,
      tradeSurplusRecipient: FEE_RECIPIENT,
    };

    async function main() {
      const response = await fetch(`/api/price?${qs.stringify(params)}`);
      const data = await response.json();
      console.log(data);

      if (data?.validationErrors?.length > 0) {
        setError(data.validationErrors);
      } else {
        setError([]);
      }
      if (data.buyAmount) {
        setBuyAmount(formatUnits(data.buyAmount, buyTokenObject.decimals));
        setPrice(data);
      }
      if (data?.tokenMetadata) {
        setBuyTokenTax(data.tokenMetadata.buyToken);
        setSellTokenTax(data.tokenMetadata.sellToken);
      }
    }

    if (sellAmount !== '') {
      main();
    }
  }, [
    sellTokenObject.address,
    buyTokenObject.address,
    parsedSellAmount,
    parsedBuyAmount,
    chainId,
    sellToken,
    sellAmount,
    setPrice,
    userAddress,
    FEE_RECIPIENT,
    AFFILIATE_FEE,
  ]);

  const { data, isError, isLoading } = useBalance({
    address: userAddress,
    token: sellTokenObject.address,
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
                  <Image
                    alt={sellToken}
                    className="h-9 w-9 mr-2 rounded-md"
                    src={MONAD_TOKENS_BY_SYMBOL[sellToken].logoURI}
                    width={36}
                    height={36}
                  />
                  <Select
                    onValueChange={handleSellTokenChange}
                    defaultValue="wmon"
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
                  <Image
                    alt={buyToken}
                    className="h-9 w-9 mr-2 rounded-md"
                    src={MONAD_TOKENS_BY_SYMBOL[buyToken].logoURI}
                    width={36}
                    height={36}
                  />
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
                    value={buyAmount}
                    placeholder="Cantidad estimada..."
                    disabled
                  />
                </div>
              </div>
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
                  sellTokenAddress={MONAD_TOKENS_BY_SYMBOL[sellToken].address}
                  userAddress={userAddress as `0x${string}`}
                  onClick={() => setFinalize(true)}
                  disabled={inSufficientBalance}
                  price={price}
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
}: {
  userAddress: Address;
  onClick: () => void;
  sellTokenAddress: Address;
  disabled?: boolean;
  price: any;
}) {
  const spender = (price?.issues.allowance?.spender ??
    zeroAddress) as `0x${string}`;

  const { data: allowance, refetch } = useReadContract({
    address: sellTokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [userAddress, spender],
  });

  const { data } = useSimulateContract({
    address: sellTokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, MAX_ALLOWANCE],
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
        args: [spender, MAX_ALLOWANCE],
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

  if (price?.issues.allowance === null) {
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

  useEffect(() => {
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

    async function main() {
      const response = await fetch(`/api/quote?${qs.stringify(params)}`);
      const data = await response.json();
      console.log(data);
      setQuote(data);
    }
    main();
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
              to: quote?.transaction.to,
              data: quote.transaction.data,
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
            href={`https://monad.explorer/tx/${hash}`}
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
```

## 5. Componente Switch Chain

Crear `/src/components/web3/SwitchChainModal.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSwitchChain } from 'wagmi';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { toast } from 'sonner';

export default function SwitchChainModal({
  buttonText,
  requiredChainId,
}: {
  buttonText: string;
  requiredChainId: number;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const { chains, switchChain } = useSwitchChain({
    mutation: {
      onSuccess(data) {
        console.log(data);
        toast.success(`Cambiado a la cadena ${data.name}`);
        return null;
      },
    },
  });
  const [selectedChain] = chains.filter(
    (chain) => chain.id === requiredChainId
  );

  useEffect(() => {
    if (!isMounted) {
      setIsMounted(true);
    }
  }, [isMounted]);

  function handleSwitchChain() {
    switchChain({ chainId: selectedChain.id });
    toast.info(`Acepta el cambio a la cadena ${selectedChain.name}`);
  }

  return (
    <Dialog>
      <DialogTrigger asChild className="w-full">
        <Button>{buttonText}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">Cambiar Cadena</DialogTitle>
          <DialogDescription>
            {`Esta acción solo está habilitada para ${selectedChain?.name || 'Monad'}. Necesitas cambiar de cadena`}
          </DialogDescription>
        </DialogHeader>
        <Button onClick={handleSwitchChain}>
          {`Cambiar a ${selectedChain?.name || 'Monad'}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

## 6. Variables de Entorno

Crear `.env.local`:

```env
NEXT_PUBLIC_ZEROEX_API_KEY=tu_api_key_aqui
```

## 7. Configuración Wagmi

Asegúrate de incluir Monad en tu configuración de wagmi:

```typescript
import { defineChain } from 'viem'

export const monad = defineChain({
  id: 10143,
  name: 'Monad',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.monad.xyz'], // Ajustar según RPC real
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://monad.explorer' },
  },
})
```

## Pasos para Probar

1. **Obtener API Key**: Registrarse en [0x Dashboard](https://dashboard.0x.org/)
2. **Configurar Variables**: Agregar tu API key en `.env.local`
3. **Actualizar Direcciones**: Reemplazar las direcciones de tokens con las reales de Monad
4. **Probar Funcionalidad**:
   - Conectar wallet a Monad
   - Seleccionar tokens
   - Verificar precios
   - Aprobar allowances
   - Ejecutar swaps

## Puntos de Verificación

- [ ] Chain ID correcto (10143)
- [ ] Direcciones de tokens válidas
- [ ] API key configurada
- [ ] Explorador de bloques correcto
- [ ] RPC de Monad funcionando
- [ ] Tokens con suficiente liquidez

## Notas Importantes

- Las direcciones de tokens son placeholders y deben ser reemplazadas
- La URL del explorador debe coincidir con el explorador real de Monad
- Verificar que los tokens seleccionados tengan liquidez en la red Monad
- 0x Swap API tiene soporte confirmado para Monad Chain ID 10143
# Guía de Transacciones Gasless con 0x API en Monad

## ¿Qué son las Transacciones Gasless?

Las transacciones gasless permiten a los usuarios realizar intercambios de tokens sin tener que pagar gas fees directamente. Esto mejora significativamente la experiencia del usuario, especialmente para nuevos usuarios de Web3.

## Ventajas de Implementar Gasless en tu dApp

1. **Mejor Onboarding**: Los usuarios no necesitan tokens nativos para empezar
2. **Mayor Conversión**: Reduce la fricción en el proceso de intercambio
3. **UX Simplificada**: Abstrae la complejidad de approvals y gas fees
4. **Competitividad**: Ofrece una ventaja sobre dApps tradicionales

## Configuración Previa para Gasless

### 1. Habilitar Gasless API en 0x Dashboard

1. Visita [0x Dashboard](https://dashboard.0x.org/)
2. Crea una cuenta o inicia sesión
3. Ve a la sección "API Keys"
4. Habilita "Gasless API" para tu proyecto
5. Copia tu API key

### 2. Tipos TypeScript para Gasless

Actualizar `/types/index.ts`:

```typescript
// Tipos existentes...

// Nuevos tipos para Gasless API
export interface GaslessQuoteRequest {
  chainId: string;
  sellToken: string;
  buyToken: string;
  sellAmount?: string;
  buyAmount?: string;
  taker: string;
  swapFeeRecipient?: string;
  swapFeeBps?: string;
  swapFeeToken?: string;
  tradeSurplusRecipient?: string;
}

export interface GaslessQuoteResponse {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  issues: {
    allowance: {
      actual: string;
      spender: string;
    } | null;
    balance: {
      token: string;
      actual: string;
      expected: string;
    } | null;
  };
  trade: {
    eip712: {
      types: any;
      domain: any;
      message: any;
      primaryType: string;
    };
    hash: string;
  };
  approval?: {
    eip712: {
      types: any;
      domain: any;
      message: any;
      primaryType: string;
    };
    hash: string;
  };
}

export interface GaslessSubmitRequest {
  trade: {
    hash: string;
    signature: string;
  };
  approval?: {
    hash: string;
    signature: string;
  };
}

export interface GaslessSubmitResponse {
  tradeHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  transactions: {
    hash: string;
    timestamp: number;
  }[];
}

export interface GaslessStatusResponse {
  tradeHash: string;
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  transactions: {
    hash: string;
    timestamp: number;
    status: 'pending' | 'confirmed' | 'failed';
  }[];
}
```

### 3. API Routes para Gasless

#### Gasless Price Route: `/app/api/gasless/price/route.ts`

```typescript
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  try {
    const res = await fetch(
      `https://api.0x.org/gasless/price?${searchParams}`,
      {
        headers: {
          '0x-api-key': process.env.NEXT_PUBLIC_ZEROEX_API_KEY as string,
          '0x-version': 'v2',
        },
      }
    );
    
    const data = await res.json();
    
    console.log('gasless price data:', data);
    
    return Response.json(data);
  } catch (error) {
    console.error('Error en gasless price:', error);
    return Response.json({ error: 'Error obteniendo precio gasless' }, { status: 500 });
  }
}
```

#### Gasless Quote Route: `/app/api/gasless/quote/route.ts`

```typescript
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  try {
    const res = await fetch(
      `https://api.0x.org/gasless/quote?${searchParams}`,
      {
        headers: {
          '0x-api-key': process.env.NEXT_PUBLIC_ZEROEX_API_KEY as string,
          '0x-version': 'v2',
        },
      }
    );
    
    const data = await res.json();
    
    console.log('gasless quote data:', data);
    
    return Response.json(data);
  } catch (error) {
    console.error('Error en gasless quote:', error);
    return Response.json({ error: 'Error obteniendo cotización gasless' }, { status: 500 });
  }
}
```

#### Gasless Submit Route: `/app/api/gasless/submit/route.ts`

```typescript
import { type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const res = await fetch(
      'https://api.0x.org/gasless/submit',
      {
        method: 'POST',
        headers: {
          '0x-api-key': process.env.NEXT_PUBLIC_ZEROEX_API_KEY as string,
          '0x-version': 'v2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );
    
    const data = await res.json();
    
    console.log('gasless submit data:', data);
    
    return Response.json(data);
  } catch (error) {
    console.error('Error en gasless submit:', error);
    return Response.json({ error: 'Error enviando transacción gasless' }, { status: 500 });
  }
}
```

#### Gasless Status Route: `/app/api/gasless/status/[tradeHash]/route.ts`

```typescript
import { type NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { tradeHash: string } }
) {
  try {
    const { tradeHash } = params;
    
    const res = await fetch(
      `https://api.0x.org/gasless/status/${tradeHash}`,
      {
        headers: {
          '0x-api-key': process.env.NEXT_PUBLIC_ZEROEX_API_KEY as string,
          '0x-version': 'v2',
        },
      }
    );
    
    const data = await res.json();
    
    console.log('gasless status data:', data);
    
    return Response.json(data);
  } catch (error) {
    console.error('Error en gasless status:', error);
    return Response.json({ error: 'Error obteniendo estado gasless' }, { status: 500 });
  }
}
```

### 4. Componente Gasless Swap

Crear `/src/components/web3/GaslessSwapModal.tsx`:

```typescript
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLinkIcon, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useSignTypedData } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
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
import { Badge } from '../ui/badge';
import {
  AFFILIATE_FEE,
  FEE_RECIPIENT,
  MONAD_TOKENS,
  MONAD_TOKENS_BY_SYMBOL,
  Token,
} from '@/lib/constants';
import { toast } from 'sonner';
import {
  GaslessQuoteRequest,
  GaslessQuoteResponse,
  GaslessSubmitResponse,
  GaslessStatusResponse,
} from '../../../types/index';

type GaslessSwapModalProps = {
  userAddress: `0x${string}` | undefined;
};

export default function GaslessSwapModal({ userAddress }: GaslessSwapModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [sellToken, setSellToken] = useState('wmon');
  const [sellAmount, setSellAmount] = useState('');
  const [buyToken, setBuyToken] = useState('usdc');
  const [buyAmount, setBuyAmount] = useState('');
  const [quote, setQuote] = useState<GaslessQuoteResponse | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [tradeHash, setTradeHash] = useState<string | null>(null);
  const [tradeStatus, setTradeStatus] = useState<GaslessStatusResponse | null>(null);

  const { signTypedDataAsync } = useSignTypedData();

  const sellTokenObject = MONAD_TOKENS_BY_SYMBOL[sellToken];
  const buyTokenObject = MONAD_TOKENS_BY_SYMBOL[buyToken];

  useEffect(() => {
    if (!isMounted) {
      setIsMounted(true);
    }
  }, [isMounted]);

  // Obtener precio indicativo
  useEffect(() => {
    if (!sellAmount || !userAddress) return;

    const fetchPrice = async () => {
      const params: GaslessQuoteRequest = {
        chainId: '10143',
        sellToken: sellTokenObject.address,
        buyToken: buyTokenObject.address,
        sellAmount: parseUnits(sellAmount, sellTokenObject.decimals).toString(),
        taker: userAddress,
        swapFeeRecipient: FEE_RECIPIENT,
        swapFeeBps: AFFILIATE_FEE,
        swapFeeToken: buyTokenObject.address,
        tradeSurplusRecipient: FEE_RECIPIENT,
      };

      try {
        const response = await fetch(`/api/gasless/price?${qs.stringify(params)}`);
        const data = await response.json();
        
        if (data.buyAmount) {
          setBuyAmount(formatUnits(data.buyAmount, buyTokenObject.decimals));
        }
      } catch (error) {
        console.error('Error obteniendo precio gasless:', error);
      }
    };

    fetchPrice();
  }, [sellAmount, sellTokenObject, buyTokenObject, userAddress]);

  // Monitorear estado del trade
  useEffect(() => {
    if (!tradeHash) return;

    const pollTradeStatus = async () => {
      try {
        const response = await fetch(`/api/gasless/status/${tradeHash}`);
        const data = await response.json();
        setTradeStatus(data);

        if (data.status === 'confirmed' || data.status === 'failed') {
          return; // Detener polling
        }

        // Continuar polling cada 3 segundos
        setTimeout(pollTradeStatus, 3000);
      } catch (error) {
        console.error('Error obteniendo estado del trade:', error);
      }
    };

    pollTradeStatus();
  }, [tradeHash]);

  const handleGetQuote = async () => {
    if (!userAddress || !sellAmount) return;

    setIsLoading(true);
    
    const params: GaslessQuoteRequest = {
      chainId: '10143',
      sellToken: sellTokenObject.address,
      buyToken: buyTokenObject.address,
      sellAmount: parseUnits(sellAmount, sellTokenObject.decimals).toString(),
      taker: userAddress,
      swapFeeRecipient: FEE_RECIPIENT,
      swapFeeBps: AFFILIATE_FEE,
      swapFeeToken: buyTokenObject.address,
      tradeSurplusRecipient: FEE_RECIPIENT,
    };

    try {
      const response = await fetch(`/api/gasless/quote?${qs.stringify(params)}`);
      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setQuote(data);
      setBuyAmount(formatUnits(data.buyAmount, buyTokenObject.decimals));
      toast.success('Cotización gasless obtenida');
    } catch (error) {
      console.error('Error obteniendo cotización gasless:', error);
      toast.error('Error obteniendo cotización');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteGaslessSwap = async () => {
    if (!quote || !userAddress) return;

    setIsLoading(true);

    try {
      // 1. Firmar approval si es necesario
      let approvalSignature: string | undefined;
      if (quote.approval) {
        console.log('Firmando approval gasless...');
        approvalSignature = await signTypedDataAsync(quote.approval.eip712);
        toast.success('Approval firmado');
      }

      // 2. Firmar el trade
      console.log('Firmando trade gasless...');
      const tradeSignature = await signTypedDataAsync(quote.trade.eip712);
      toast.success('Trade firmado');

      // 3. Enviar transacción gasless
      const submitData = {
        trade: {
          hash: quote.trade.hash,
          signature: tradeSignature,
        },
        ...(approvalSignature && quote.approval && {
          approval: {
            hash: quote.approval.hash,
            signature: approvalSignature,
          }
        }),
      };

      const response = await fetch('/api/gasless/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result: GaslessSubmitResponse = await response.json();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setTradeHash(result.tradeHash);
      toast.success('Transacción gasless enviada');
      
      // Limpiar formulario
      setSellAmount('');
      setBuyAmount('');
      setQuote(undefined);

    } catch (error) {
      console.error('Error ejecutando swap gasless:', error);
      toast.error('Error en transacción gasless');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'confirmed':
        return 'Confirmado';
      case 'failed':
        return 'Falló';
      case 'expired':
        return 'Expirado';
      default:
        return 'Desconocido';
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild className="w-full">
        <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
          🚀 Swap Gasless
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Swap Gasless en Monad</DialogTitle>
          <DialogDescription>
            Intercambia tokens sin pagar gas fees. Tu transacción será patrocinada.
          </DialogDescription>
        </DialogHeader>

        {isMounted ? (
          <div className="space-y-6">
            {/* Formulario de Swap */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Image
                  alt={sellToken}
                  className="h-8 w-8 rounded-full"
                  src={MONAD_TOKENS_BY_SYMBOL[sellToken].logoURI}
                  width={32}
                  height={32}
                />
                <Select
                  onValueChange={setSellToken}
                  defaultValue="wmon"
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONAD_TOKENS.map((token: Token) => (
                      <SelectItem
                        key={token.address}
                        value={token.symbol.toLowerCase()}
                      >
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  type="number"
                  placeholder="0.0"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                />
              </div>

              <div className="flex justify-center">
                <div className="rotate-90 text-gray-400">⇄</div>
              </div>

              <div className="flex items-center gap-2">
                <Image
                  alt={buyToken}
                  className="h-8 w-8 rounded-full"
                  src={MONAD_TOKENS_BY_SYMBOL[buyToken].logoURI}
                  width={32}
                  height={32}
                />
                <Select
                  onValueChange={setBuyToken}
                  defaultValue="usdc"
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONAD_TOKENS.map((token: Token) => (
                      <SelectItem
                        key={token.address}
                        value={token.symbol.toLowerCase()}
                      >
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  type="number"
                  placeholder="0.0"
                  value={buyAmount}
                  disabled
                />
              </div>
            </div>

            {/* Información del Quote */}
            {quote && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Recibirás:</span>
                  <span className="font-medium">
                    {buyAmount} {buyTokenObject.symbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Gas fees:</span>
                  <Badge variant="secondary">Patrocinado 🎉</Badge>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Cotización válida por:</span>
                  <span>30 segundos</span>
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="space-y-2">
              {!quote ? (
                <Button
                  onClick={handleGetQuote}
                  disabled={!sellAmount || !userAddress || isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Obteniendo cotización...' : 'Obtener Cotización'}
                </Button>
              ) : (
                <Button
                  onClick={handleExecuteGaslessSwap}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  {isLoading ? 'Procesando...' : '🚀 Ejecutar Swap Gasless'}
                </Button>
              )}

              {quote && (
                <Button
                  variant="outline"
                  onClick={() => setQuote(undefined)}
                  className="w-full"
                >
                  Nueva Cotización
                </Button>
              )}
            </div>

            {/* Estado del Trade */}
            {tradeHash && tradeStatus && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(tradeStatus.status)}
                  <span className="font-medium">
                    Estado: {getStatusText(tradeStatus.status)}
                  </span>
                </div>
                
                <div className="text-sm">
                  <span className="text-gray-600">Trade Hash:</span>
                  <div className="font-mono text-xs break-all mt-1">
                    {tradeHash}
                  </div>
                </div>

                {tradeStatus.transactions.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Transacciones:</span>
                    {tradeStatus.transactions.map((tx, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(tx.status)}
                          <span>Tx {index + 1}</span>
                        </div>
                        <Link
                          href={`https://monad.explorer/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
                        >
                          Ver <ExternalLinkIcon className="h-3 w-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Información Adicional */}
            <div className="text-xs text-gray-500 space-y-1">
              <div>✅ Sin gas fees para el usuario</div>
              <div>✅ Transacciones patrocinadas</div>
              <div>✅ Mejor experiencia de usuario</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Utilidades para Gasless

Crear `/src/lib/gasless.ts`:

```typescript
import { GaslessQuoteRequest, GaslessStatusResponse } from '../../types/index';

export class GaslessService {
  private apiKey: string;
  private baseUrl: string = 'https://api.0x.org/gasless';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getPrice(params: GaslessQuoteRequest) {
    const response = await fetch(`/api/gasless/price?${new URLSearchParams(params as any)}`);
    return response.json();
  }

  async getQuote(params: GaslessQuoteRequest) {
    const response = await fetch(`/api/gasless/quote?${new URLSearchParams(params as any)}`);
    return response.json();
  }

  async submitTrade(tradeData: { trade: { hash: string; signature: string }; approval?: { hash: string; signature: string } }) {
    const response = await fetch('/api/gasless/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tradeData),
    });
    return response.json();
  }

  async getTradeStatus(tradeHash: string): Promise<GaslessStatusResponse> {
    const response = await fetch(`/api/gasless/status/${tradeHash}`);
    return response.json();
  }

  // Utilidad para dividir firmas si es necesario
  splitSignature(signature: string) {
    const r = signature.slice(0, 66);
    const s = '0x' + signature.slice(66, 130);
    const v = parseInt(signature.slice(130, 132), 16);
    return { r, s, v };
  }
}

// Hook personalizado para usar el servicio gasless
import { useMemo } from 'react';

export function useGaslessService() {
  return useMemo(() => {
    const apiKey = process.env.NEXT_PUBLIC_ZEROEX_API_KEY;
    if (!apiKey) {
      throw new Error('0x API key no configurada');
    }
    return new GaslessService(apiKey);
  }, []);
}
```

## Diferencias Clave: Gasless vs Swap Tradicional

| Aspecto | Swap Tradicional | Gasless Swap |
|---------|------------------|--------------|
| **Gas Fees** | Usuario paga | Patrocinado por 0x |
| **Approvals** | Transacción on-chain | Firma off-chain |
| **Pasos** | 1-2 transacciones | Solo firmas |
| **Tiempo** | Depende de red | Más rápido |
| **UX** | Requiere tokens nativos | Solo tokens ERC20 |
| **Complejidad** | Mayor | Simplificada |

## Flujo de Implementación Gasless

1. **Setup**: Configurar API keys y endpoints
2. **Precio**: Obtener cotización indicativa
3. **Quote**: Obtener cotización firme con objetos EIP-712
4. **Firma**: Firmar approval (si necesario) y trade off-chain
5. **Submit**: Enviar firmas a 0x para ejecución
6. **Monitor**: Seguir estado hasta confirmación

## Mejores Prácticas

### Manejo de Errores
```typescript
// Implementar retry logic
const retryGaslessRequest = async (fn: () => Promise<any>, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### Validación de Quotes
```typescript
// Validar que el quote no haya expirado
const isQuoteValid = (quoteTimestamp: number) => {
  const now = Date.now();
  const expirationTime = 30 * 1000; // 30 segundos
  return (now - quoteTimestamp) < expirationTime;
};
```

### Monitoreo de Estado
```typescript
// Polling inteligente con backoff
const pollTradeStatus = async (tradeHash: string) => {
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    const status = await gaslessService.getTradeStatus(tradeHash);
    
    if (status.status === 'confirmed' || status.status === 'failed') {
      return status;
    }
    
    attempts++;
    const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  throw new Error('Timeout esperando confirmación');
};
```

## Consideraciones de Seguridad

1. **Validar Parámetros**: Siempre validar amounts y direcciones
2. **Rate Limiting**: Implementar límites de requests
3. **Manejo de Claves**: Nunca exponer API keys en el cliente
4. **Validación de Firmas**: Verificar que las firmas correspondan al usuario
5. **Monitoreo**: Implementar logging y alertas

## Integración con Monad Testnet

Monad testnet soporta completamente la Gasless API de 0x. Configuración específica:

```typescript
// Configuración para Monad Testnet
export const MONAD_TESTNET_CONFIG = {
  chainId: 10143,
  name: 'Monad Testnet',
  gaslessSupported: true,
  explorerUrl: 'https://monad.explorer',
  rpcUrl: 'https://rpc.monad.xyz', // Actualizar con RPC real
};
```

## Pasos para Testing en Monad

1. **Conectar a Monad Testnet**: Configurar wallet para chain ID 10143
2. **Obtener Tokens de Prueba**: Usar faucet para WMON, USDC, DAI
3. **Probar Gasless Flow**: Ejecutar swaps sin gas fees
4. **Monitorear Transacciones**: Verificar en Monad explorer
5. **Optimizar UX**: Ajustar timeouts y mensajes de usuario

## Troubleshooting Común

| Error | Solución |
|-------|----------|
| "Quote expired" | Obtener nueva cotización, reducir tiempo UI |
| "Insufficient balance" | Verificar balance del token de venta |
| "Signature invalid" | Revisar parámetros EIP-712, re-firmar |
| "API key invalid" | Verificar configuración y permisos |
| "Network mismatch" | Confirmar chain ID correcto (10143) |

---

```

Este archivo markdown contiene todo el tutorial completo adaptado para Monad. Las principales adaptaciones incluyen:

1. **Chain ID correcto**: 10143 para Monad
2. **Referencias actualizadas**: MONAD_TOKENS en lugar de POLYGON_TOKENS
3. **Explorador correcto**: URLs de Monad explorer
4. **Configuración específica**: Toda la configuración adaptada para la red Monad

Necesitarás reemplazar las direcciones de tokens placeholders con las direcciones reales de los tokens en Monad y verificar que el RPC y explorador sean correctos.