# Nodius Backend

Gas abstraction relay backend for Nodius Wallet — an omnichain crypto wallet supporting EVM, Solana, and TON.

Built with [Hono](https://hono.dev/) + TypeScript + [Supabase](https://supabase.com/).

## Features

- **EVM Gas Abstraction** — EIP-712 meta-transaction relay for Sepolia & Base Sepolia
- **Solana Fee Sponsorship** — sponsored SOL transfers and Jupiter swap paths on devnet
- **TON Gas Abstraction** — external message sender via TonClient (partial, per-user smart wallet flow pending)
- **Relay Queue** — Supabase-backed queue with worker processing
- **Gas Pool Monitoring** — track relayer balances and alert on low funds
- **Network Mode** — `devnet` / `testnet` / `mainnet` support via `x-network-mode` header
- **OpenAPI Docs** — auto-generated Swagger UI at `/ui`

## Prerequisites

- Node.js >= 20
- Supabase project (Postgres)
- Relayer wallets:
  - EVM: private key with funded relay contract
  - Solana: keypair with devnet SOL
  - TON: mnemonic for sponsor wallet

## Setup

```bash
git clone <repo-url>
cd nodius-backend
npm install
```

### Environment

Copy `.env.example` to `.env` and configure:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Supabase service role key |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `SUPABASE_MGMT_TOKEN` | Supabase management token |
| `RELAYER_PRIVATE_KEY` | EVM relayer private key |
| `RELAY_CONTRACT_ETH` | NodiusRelay address on Ethereum/Sepolia |
| `RELAY_CONTRACT_BASE` | NodiusRelay address on Base/Base Sepolia |
| `SOLANA_RELAYER_PRIVATE_KEY` | Solana fee payer keypair (base58) |
| `TON_RELAYER_MNEMONIC` | TON sponsor wallet mnemonic |
| `TONCENTER_API_KEY` | TonCenter API key |
| `TON_GASLESS_WALLET_ADDRESS` | Deployed TonGaslessWallet address |
| `PORT` | Server port (default: 3001) |
| `APP_NETWORK` | Network mode (default: `testnet`) |

## Usage

```bash
# Development with hot reload
npm run dev

# Production build
npm run build
node dist/index.js

# Without watcher (avoids ENOSPC issues)
npx tsx src/index.ts
```

### Database

```bash
# Generate migration
npm run db:generate

# Push schema to Supabase
npm run db:push
```

## API

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /health` | Public | Health check |
| `GET /doc` | Public | OpenAPI spec |
| `GET /ui` | Public | Swagger UI |
| `POST /relay/submit` | User | Submit raw relay tx |
| `POST /relay/meta-submit` | User | Submit EIP-712 meta-tx |
| `GET /relay/status/:id` | User/Secret | Get relay status |
| `GET /relay/sponsored-info` | User/Publishable | Get sponsored relayer info |
| `POST /relay/sponsored-solana-swap` | User | Build sponsored Solana swap |
| `POST /relay/sponsored-solana-transfer` | User | Build sponsored SOL transfer |
| `POST /relay/sponsored-ton-swap` | User | Send sponsored TON swap |
| `GET /relay/info/:chainId` | User/Publishable | Relay contract/relayer info |
| `GET /relay/pending` | Secret | List pending relays |
| `POST /relay/complete/:id` | Secret | Mark relay complete |
| `POST /relay/fail/:id` | Secret | Mark relay failed |
| `GET /nonce/:wallet/:chainId` | User | Get nonce for wallet |
| `GET /gas-pool/:chainId` | User/Publishable | Get gas pool status |

## Architecture

```
src/
├── index.ts              Hono API, routes, Zod schemas, Swagger UI
├── relayer.ts            Relay queue, nonce, gas pool, meta-tx orchestration
├── evmSponsor.ts         Viem wallet + NodiusRelay ABI + executeRelayTx
├── solanaSponsor.ts      Jupiter swap / SOL transfer builder
├── tonSponsor.ts         TON external message sender
├── sponsoredRelayers.ts  Solana + TON keypair helpers
├── worker.ts             Queue processor + gas pool monitor
├── db/
│   ├── index.ts          Supabase admin client + network mode
│   └── schema.ts         Drizzle Postgres schema
scripts/                  Supabase migration / RLS helpers
```

## License

MIT
