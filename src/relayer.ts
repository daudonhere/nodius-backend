import { supabaseAdmin, getNetworkMode, parseNetworkMode, type NetworkMode } from './db/index'
import { executeRelayTx, getContractNonce } from './evmSponsor'

const CHAIN_RPCS: Record<number, string> = {
  [Number(process.env.ETH_CHAIN_ID || 1)]: process.env.ETH_RPC || 'https://eth.llamarpc.com',
  [Number(process.env.POLYGON_CHAIN_ID || 137)]: process.env.POLYGON_RPC || 'https://polygon.llamarpc.com',
  [Number(process.env.ARBITRUM_CHAIN_ID || 42161)]: process.env.ARBITRUM_RPC || 'https://arbitrum.llamarpc.com',
  [Number(process.env.BASE_CHAIN_ID || 8453)]: process.env.BASE_RPC || 'https://base.llamarpc.com',
  [Number(process.env.SEPOLIA_CHAIN_ID || 11155111)]: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || ''}`,
  [Number(process.env.BASE_SEPOLIA_CHAIN_ID || 84532)]: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
}

const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com'

const defaultNetworkMode = getNetworkMode()

export async function submitRelay(
  userAddress: string,
  chainType: string,
  chainId: number,
  signedTx: string,
  mode?: NetworkMode,
): Promise<{ id: string; txHash?: string; error?: string }> {
  const rpc = chainType === 'solana' ? SOLANA_RPC : CHAIN_RPCS[chainId]
  if (!rpc) return { id: '', error: `Unsupported chain: ${chainId}` }

  const networkMode = mode ?? defaultNetworkMode

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('relay_queue')
    .insert({
      network_mode: networkMode,
      chain_type: chainType,
      chain_id: String(chainId),
      user_address: userAddress,
      tx_type: 'transfer',
      payload: { signedTx },
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !inserted) return { id: '', error: insertError?.message || 'Insert failed' }

  const id = inserted.id

  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const isSolana = chainType === 'solana'
      const rawTx = isSolana ? Buffer.from(signedTx.replace(/^0x/, ''), 'hex').toString('base64') : signedTx
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
const JSON_RPC_ID = Number(process.env.JSON_RPC_ID || 1)
...
          jsonrpc: '2.0',
          id: JSON_RPC_ID,
          method: isSolana ? 'sendTransaction' : 'eth_sendRawTransaction',
          params: isSolana ? [rawTx, { encoding: 'base64' }] : [rawTx],
        }),
      })

      const data = await res.json()
      if (data.error) return { id, error: data.error.message || 'RPC error' }

      const txHash: string = data.result

      await supabaseAdmin
        .from('relay_queue')
        .update({ status: 'submitted', tx_hash: txHash })
        .eq('id', id)

      return { id, txHash }
    } catch {
      if (attempt === maxRetries - 1) {
        await markRelayFailed(id, 'Broadcast failed after retries')
        return { id, error: 'Broadcast failed after retries' }
      }
    }
  }

  return { id, error: 'Broadcast failed' }
}

export async function getRelayStatus(id: string) {
  const { data } = await supabaseAdmin
    .from('relay_queue')
    .select('*')
    .eq('id', id)
    .single()

  return data || null
}

export async function getNonce(walletAddress: string, chainId: number): Promise<number> {
  const contractNonce = await getContractNonce(walletAddress as `0x${string}`, chainId)
  return contractNonce
}

export async function incrementNonce(walletAddress: string, chainId: number, mode?: NetworkMode): Promise<number> {
  const nextNonce = await getNonce(walletAddress, chainId) + 1
  const networkMode = mode ?? defaultNetworkMode

  const { data: existing } = await supabaseAdmin
    .from('nonce_tracker')
    .select('id')
    .eq('user_address', walletAddress)
    .eq('chain_id', String(chainId))
    .eq('network_mode', networkMode)
    .limit(1)
    .maybeSingle()

  if (existing) {
    await supabaseAdmin
      .from('nonce_tracker')
      .update({ nonce: nextNonce })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin
      .from('nonce_tracker')
      .insert({
        network_mode: networkMode,
        chain_id: String(chainId),
        user_address: walletAddress,
        nonce: nextNonce,
      })
  }

  return nextNonce
}

export async function getGasPool(chainId: number, mode?: NetworkMode) {
  const networkMode = mode ?? defaultNetworkMode
  const { data: pools } = await supabaseAdmin
    .from('gas_pool')
    .select('*')
    .eq('chain_id', String(chainId))
    .eq('network_mode', networkMode)

  return (pools || []).map((p) => ({
    symbol: p.native_symbol,
    balance: p.balance,
    threshold: p.threshold,
  }))
}

export async function updateGasPoolBalance(
  chainId: number,
  chainType: string,
  symbol: string,
  balance: string,
  relayerAddress: string,
  mode?: NetworkMode,
) {
  const networkMode = mode ?? defaultNetworkMode
  const { data: existing } = await supabaseAdmin
    .from('gas_pool')
    .select('id, threshold')
    .eq('chain_id', String(chainId))
    .eq('chain_type', chainType)
    .eq('native_symbol', symbol)
    .eq('network_mode', networkMode)
    .maybeSingle()

  const status = Number(balance) < Number(existing?.threshold || '0') ? 'low' : 'healthy'

  if (existing) {
    await supabaseAdmin
      .from('gas_pool')
      .update({ balance, status, last_checked_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin
      .from('gas_pool')
      .insert({
        network_mode: networkMode,
        chain_type: chainType,
        chain_id: String(chainId),
        relayer_address: relayerAddress,
        native_symbol: symbol,
        balance,
    const RELAY_THRESHOLD = process.env.RELAY_THRESHOLD || '0.1'
...
    threshold: RELAY_THRESHOLD,
        status,
        last_checked_at: new Date().toISOString(),
      })
  }
}

export async function submitMetaTx(
  params: {
    walletId: string
    source: string
    chainId: number
    target: string
    value: string
    data: string
    nonce: number
    deadline: number
    signature: string
  },
  mode?: NetworkMode,
): Promise<{ id: string; txHash?: string; error?: string }> {
  const rpc = CHAIN_RPCS[params.chainId]
  if (!rpc) return { id: '', error: `Unsupported chain: ${params.chainId}` }

  const networkMode = mode ?? defaultNetworkMode

  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await executeRelayTx({
        chainId: params.chainId,
        target: params.target as `0x${string}`,
        value: params.value,
        data: params.data as `0x${string}`,
        nonce: params.nonce,
        deadline: params.deadline,
        signature: params.signature as `0x${string}`,
      })

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('relay_queue')
        .insert({
          network_mode: networkMode,
          chain_type: params.source,
          chain_id: String(params.chainId),
          user_address: params.walletId,
          tx_type: 'meta_tx',
          payload: {
            target: params.target,
            value: params.value,
            calldata: params.data,
            signature: params.signature,
            nonce: params.nonce,
            deadline: params.deadline,
          },
          status: 'submitted',
          tx_hash: result.txHash,
        })
        .select('id')
        .single()

      if (insertError || !inserted) return { id: '', error: insertError?.message || 'Insert failed' }
      return { id: inserted.id, txHash: result.txHash }
    } catch (err: any) {
      if (attempt === maxRetries - 1) {
        return { id: '', error: err.message || 'Meta-tx relay failed' }
      }
    }
  }

  return { id: '', error: 'Meta-tx relay failed' }
}

export async function listPendingRelays(mode?: NetworkMode) {
  const networkMode = mode ?? defaultNetworkMode
  const { data } = await supabaseAdmin
    .from('relay_queue')
    .select('*')
    .eq('status', 'pending')
    .eq('network_mode', networkMode)
    .order('created_at', { ascending: true })
    .limit(50)

  return data || []
}

export async function markRelayComplete(id: string, txHash: string) {
  await supabaseAdmin
    .from('relay_queue')
    .update({ status: 'confirmed', tx_hash: txHash })
    .eq('id', id)
}

export async function markRelayFailed(id: string, error: string) {
  await supabaseAdmin
    .from('relay_queue')
    .update({ status: 'failed', error_message: error })
    .eq('id', id)
}
