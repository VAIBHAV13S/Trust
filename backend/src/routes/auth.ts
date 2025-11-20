import express, { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { TextEncoder } from 'util'
import { verifyPersonalMessageSignature } from '@onelabs/sui/verify'
import Player from '../models/Player.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this'

interface AuthRequest extends Request {
  user?: any
}

// Middleware to verify JWT
export const authMiddleware = (req: AuthRequest, res: Response, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' })
  }
}

// Login/Register with wallet
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message } = req.body

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      })
    }

    // Verify signature (OneChain / Sui-style personal message)
    const encoder = new TextEncoder()
    const messageBytes = encoder.encode(message)

    try {
      await verifyPersonalMessageSignature(messageBytes, signature, {
        address: walletAddress.toLowerCase(),
      })
    } catch (err) {
      return res.status(401).json({
        error: 'Invalid signature',
        code: 'INVALID_SIGNATURE',
      })
    }

    // Find or create player
    let player = await Player.findOne({ walletAddress: walletAddress.toLowerCase() })

    if (!player) {
      // Auto-create player with generated username
      const username = `player_${walletAddress.substring(0, 6)}`
      player = new Player({
        walletAddress: walletAddress.toLowerCase(),
        username,
        reputation: 1000,
        tokensStaked: 0,
        tokensAvailable: 0,
        totalEarnings: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        cooperationRate: 0,
        betrayalRate: 0,
      })
      await player.save()
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        walletAddress: player.walletAddress,
        userId: player._id,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      token,
      player: {
        id: player._id,
        walletAddress: player.walletAddress,
        username: player.username,
        reputation: player.reputation,
        tokensStaked: player.tokensStaked,
        tokensAvailable: player.tokensAvailable,
      },
    })
  } catch (error: any) {
    console.error('Login error:', error)
    res.status(500).json({
      error: error.message || 'Login failed',
      code: 'LOGIN_ERROR',
    })
  }
})

// Get player profile
router.get('/profile/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params

    const player = await Player.findOne({ walletAddress: address.toLowerCase() })

    if (!player) {
      return res.status(404).json({
        error: 'Player not found',
        code: 'PLAYER_NOT_FOUND',
      })
    }

    res.json({
      id: player._id,
      walletAddress: player.walletAddress,
      username: player.username,
      reputation: player.reputation,
      tokensStaked: player.tokensStaked,
      tokensAvailable: player.tokensAvailable,
      totalEarnings: player.totalEarnings,
      matchesPlayed: player.matchesPlayed,
      matchesWon: player.matchesWon,
      cooperationRate: player.cooperationRate,
      betrayalRate: player.betrayalRate,
      createdAt: player.createdAt,
    })
  } catch (error: any) {
    console.error('Profile fetch error:', error)
    res.status(500).json({
      error: error.message || 'Failed to fetch profile',
      code: 'PROFILE_FETCH_ERROR',
    })
  }
})

// Update player profile (username, etc.)
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.body
    const { walletAddress } = req.user

    // Validate username
    if (username) {
      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({
          error: 'Username must be 3-20 characters',
          code: 'INVALID_USERNAME',
        })
      }

      // Check if username is taken
      const existing = await Player.findOne({
        username: username.toLowerCase(),
        walletAddress: { $ne: walletAddress },
      })

      if (existing) {
        return res.status(400).json({
          error: 'Username already taken',
          code: 'USERNAME_TAKEN',
        })
      }
    }

    const player = await Player.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { username: username || undefined },
      { new: true }
    )

    if (!player) {
      return res.status(404).json({
        error: 'Player not found',
        code: 'PLAYER_NOT_FOUND',
      })
    }

    res.json({
      id: player._id,
      walletAddress: player.walletAddress,
      username: player.username,
      reputation: player.reputation,
    })
  } catch (error: any) {
    console.error('Profile update error:', error)
    res.status(500).json({
      error: error.message || 'Failed to update profile',
      code: 'PROFILE_UPDATE_ERROR',
    })
  }
})

// Get current user profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { walletAddress } = req.user

    const player = await Player.findOne({ walletAddress: walletAddress.toLowerCase() })

    if (!player) {
      return res.status(404).json({
        error: 'Player not found',
        code: 'PLAYER_NOT_FOUND',
      })
    }

    res.json({
      id: player._id,
      walletAddress: player.walletAddress,
      username: player.username,
      reputation: player.reputation,
      tokensStaked: player.tokensStaked,
      tokensAvailable: player.tokensAvailable,
      totalEarnings: player.totalEarnings,
      matchesPlayed: player.matchesPlayed,
      matchesWon: player.matchesWon,
      cooperationRate: player.cooperationRate,
      betrayalRate: player.betrayalRate,
    })
  } catch (error: any) {
    console.error('Auth profile error:', error)
    res.status(500).json({
      error: error.message || 'Failed to fetch auth profile',
      code: 'AUTH_PROFILE_ERROR',
    })
  }
})

export default router
