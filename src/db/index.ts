import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

export type NetworkMode = 'devnet' | 'testnet' | 'mainnet'

export function getNetworkMode(): NetworkMode {
  return (process.env.APP_NETWORK as NetworkMode) || 'testnet'
}

export function parseNetworkMode(value?: string | null): NetworkMode {
  return value === 'devnet' || value === 'testnet' || value === 'mainnet' ? value : getNetworkMode()
}
