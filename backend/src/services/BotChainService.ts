import crypto from 'crypto'
import { blake2b } from '@noble/hashes/blake2.js'
import { Transaction } from '@onelabs/sui/transactions'
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519'
import { oneChainClient } from './onechain-client.js'

const PKG_ID = process.env.GAME_CONTRACT_ADDRESS || '0x0'
const MODULE = 'game_manager'
const BOT_CONTROLLER_KEY = process.env.BOT_CONTROLLER_KEY
const GAME_STATE_ID = process.env.GAME_STATE_ID || '0x6'
const CLOCK_ID = '0x6'

export class BotChainService {
  private readonly keypair: Ed25519Keypair | null
  private readonly address: string | null

  constructor() {
    if (!BOT_CONTROLLER_KEY) {
      this.keypair = null
      this.address = null
      return
    }

    try {
      const keypair = Ed25519Keypair.fromSecretKey(BOT_CONTROLLER_KEY)
      this.keypair = keypair
      this.address = keypair.getPublicKey().toSuiAddress()
      console.log('[BotChainService] Initialized bot controller wallet', {
        address: this.address,
      })
    } catch (err) {
      console.error('[BotChainService] Failed to initialize bot controller keypair', err)
      this.keypair = null
      this.address = null
    }
  }

  getAddress(): string | null {
    return this.address
  }

  private requireSigner() {
    if (!this.keypair || !this.address) {
      throw new Error('BotChainService signer not configured. Set BOT_CONTROLLER_KEY in env.')
    }
  }

  async stake(matchObjectId: string, amount: bigint): Promise<void> {
    this.requireSigner()

    await this.execute('Stake tokens', (tx) => {
      tx.moveCall({
        target: `${PKG_ID}::${MODULE}::stake_tokens`,
        arguments: [tx.object(matchObjectId), tx.pure.u64(amount)],
      })
    })
  }

  async commit(matchObjectId: string, commitment: Uint8Array): Promise<void> {
    this.requireSigner()
    const bytes = Array.from(commitment)

    await this.execute('Commit choice', (tx) => {
      tx.moveCall({
        target: `${PKG_ID}::${MODULE}::commit_choice`,
        arguments: [
          tx.object(GAME_STATE_ID),
          tx.object(matchObjectId),
          tx.pure.vector('u8', bytes),
          tx.object(CLOCK_ID),
        ],
      })
    })
  }

  async reveal(matchObjectId: string, choice: number, salt: Uint8Array): Promise<void> {
    this.requireSigner()
    const saltBytes = Array.from(salt)

    await this.execute('Reveal choice', (tx) => {
      tx.moveCall({
        target: `${PKG_ID}::${MODULE}::reveal_choice`,
        arguments: [
          tx.object(GAME_STATE_ID),
          tx.object(matchObjectId),
          tx.pure.u8(choice),
          tx.pure.vector('u8', saltBytes),
          tx.object(CLOCK_ID),
        ],
      })
    })
  }

  static buildSalt(length = 16): Uint8Array {
    return crypto.randomBytes(length)
  }

  static buildCommitment(choice: number, salt: Uint8Array): Uint8Array {
    const normalizedChoice = choice & 0xff
    const payload = new Uint8Array(1 + salt.length)
    payload[0] = normalizedChoice
    payload.set(salt, 1)

    // Move uses hash::blake2b256 over bcs::to_bytes(&choice) || salt
    // Node exposes blake2b512 with configurable output length; use 32 bytes.
    const hash = blake2b(payload, { dkLen: 32 })

    return new Uint8Array(hash)
  }

  private async execute(
    description: string,
    buildTx: (tx: Transaction) => void
  ): Promise<void> {
    this.requireSigner()

    const tx = new Transaction()
    buildTx(tx)

    try {
      const result = await oneChainClient.signAndExecuteTransaction({
        signer: this.keypair!,
        transaction: tx,
      })

      console.log('[BotChainService] Tx success', {
        description,
        digest: (result as any)?.digest,
      })
    } catch (err) {
      console.error('[BotChainService] Tx failed', { description, err })
      throw err
    }
  }
}
