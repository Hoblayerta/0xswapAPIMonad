# Monad 0x Swap dApp

Una aplicación descentralizada (dApp) para el intercambio de tokens usando la 0x Swap API en la red testnet de Monad.

# Links

[Direcciones de los tokens Monad](https://docs.monad.xyz/developer-essentials/network-information#testnet-tokens-partial-list)

[Dashboard 0x](https://dashboard.0x.org/)

## Características

- ✅ Interfaz moderna con Next.js 15 y React 19
- ✅ Integración completa con wagmi y RainbowKit
- ✅ Swap de tokens usando 0x API v2 con Permit2
- ✅ Soporte para Monad Testnet (Chain ID: 10143)
- ✅ UI responsiva con Tailwind CSS y shadcn/ui
- ✅ Gestión de allowances y aprobaciones de tokens
- ✅ Notificaciones toast con Sonner
- ✅ Explorador de transacciones integrado

## Configuración Inicial

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Copia el archivo de ejemplo y configura tu API key:

```bash
cp .env.example .env.local
```

Edita `.env.local` y agrega tu 0x API key:

```env
NEXT_PUBLIC_ZEROEX_API_KEY=tu_api_key_aqui
```

**Obtener API Key:**
1. Visita [0x Dashboard](https://dashboard.0x.org/)
2. Crea una cuenta o inicia sesión
3. Genera una nueva API key
4. Copia la key a tu archivo `.env.local`

### 3. Actualizar Direcciones de Tokens

Edita `src/lib/constants.ts` y reemplaza las direcciones de ejemplo con las direcciones reales de tokens en Monad:

```typescript
export const MONAD_TOKENS: Token[] = [
  {
    chainId: 10143,
    name: "Wrapped Monad",
    symbol: "WMON",
    decimals: 18,
    address: "0x...", // Dirección real del WMON
    logoURI: "https://...",
  },
  // ... más tokens
];
```

### 4. Configurar RPC y Explorador

Actualiza `src/lib/wagmi.ts` con las URLs correctas de Monad:

```typescript
export const monad = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  rpcUrls: {
    default: {
      http: ['https://tu-rpc-monad.xyz'], // RPC real de Monad
    },
  },
  blockExplorers: {
    default: { 
      name: 'Monad Explorer', 
      url: 'https://tu-explorador-monad.xyz' 
    },
  },
});
```

### 5. Configurar WalletConnect (Opcional)

Para una mejor experiencia de conexión de wallets, obtén un Project ID de [WalletConnect Cloud](https://cloud.walletconnect.com/) y actualiza `src/lib/wagmi.ts`:

```typescript
export const config = getDefaultConfig({
  appName: 'Monad 0x Swap dApp',
  projectId: 'tu_project_id_aqui',
  chains: [monad],
  ssr: true,
});
```

## Ejecutar la Aplicación

```bash
# Modo desarrollo
npm run dev

# Build para producción
npm run build
npm run start

# Linter
npm run lint
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── price/route.ts     # API endpoint para precios
│   │   └── quote/route.ts     # API endpoint para cotizaciones
│   ├── globals.css            # Estilos globales
│   ├── layout.tsx            # Layout principal
│   └── page.tsx              # Página principal
├── components/
│   ├── ui/                   # Componentes UI básicos
│   └── web3/
│       ├── SwapErc20Modal.tsx    # Modal principal de swap
│       └── SwitchChainModal.tsx  # Modal para cambiar red
├── lib/
│   ├── constants.ts          # Constantes y tokens
│   ├── utils.ts             # Utilidades
│   └── wagmi.ts             # Configuración wagmi
└── types/
    └── index.ts             # Tipos TypeScript
```

## Uso de la dApp

### 1. Conectar Wallet

- Haz clic en "Connect Wallet"
- Selecciona tu wallet preferida
- Autoriza la conexión

### 2. Cambiar a Monad Testnet

Si no estás en la red correcta:
- Haz clic en "Switch to Monad Testnet"
- Acepta el cambio de red en tu wallet

### 3. Realizar un Swap

1. **Seleccionar Tokens:**
   - Token a vender: Elige de la lista desplegable
   - Token a comprar: Elige de la lista desplegable

2. **Ingresar Cantidad:**
   - Ingresa la cantidad que deseas vender
   - La cantidad estimada a recibir se calculará automáticamente

3. **Aprobar (si es necesario):**
   - Si es la primera vez usando el token, deberás aprobar el allowance
   - Haz clic en "Aprobar" y confirma en tu wallet

4. **Revisar Trade:**
   - Haz clic en "Revisar Trade"
   - Verifica los detalles del intercambio

5. **Confirmar Swap:**
   - Haz clic en "Colocar Orden"
   - Firma el mensaje Permit2 si se solicita
   - Confirma la transacción en tu wallet

6. **Seguimiento:**
   - La transacción aparecerá con un enlace al explorador
   - Espera la confirmación en blockchain

## Características Técnicas

### 0x API Integration

- **Versión:** v2 con Permit2
- **Endpoints:** `/swap/permit2/price` y `/swap/permit2/quote`
- **Features:** 
  - Gasless approvals con Permit2
  - Mejor routing de liquidez
  - Fees de afiliado configurables

### Smart Contract Interactions

- **ERC20 Approvals:** Gestión automática de allowances
- **Permit2:** Firmas off-chain para aprobaciones
- **Transaction Simulation:** Validación previa con wagmi

### Error Handling

- Validación de balance insuficiente
- Manejo de errores de red
- Feedback visual con toast notifications
- Reintentos automáticos para fallas temporales

## Troubleshooting

### Errores Comunes

**"No se pudo obtener precio"**
- Verifica que tu API key sea válida
- Confirma que los tokens tengan liquidez
- Revisa la conexión a internet

**"Balance Insuficiente"**
- Asegúrate de tener suficientes tokens en tu wallet
- Verifica que estés en la red correcta

**"Fallo en la transacción"**
- Revisa que tengas suficiente MON para gas
- Confirma que el slippage sea aceptable
- Intenta con una cantidad menor


## Licencia

MIT
