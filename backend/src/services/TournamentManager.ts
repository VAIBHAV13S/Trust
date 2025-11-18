import Match from '../models/Match'
import Tournament, {
  ITournament,
  TournamentMatch,
  TournamentRound,
} from '../models/Tournament'
import type { QueueParticipant } from './MatchmakingQueue'

export interface BracketSeed {
  address: string
  username: string
  reputation: number
}

interface AdvanceResult {
  tournament: ITournament
  advancingPlayers: BracketSeed[]
  roundCompleted: boolean
  roundNumber: number
}

interface SeedResult {
  tournament: ITournament
  roundNumber: number
  matches: TournamentMatch[]
}

interface RoundBuildResult {
  matches: TournamentMatch[]
  nextSeeds: BracketSeed[]
  nextMatchNumber: number
}

export class TournamentManager {
  private readonly roundMultipliers: Record<number, number> = {
    1: 1.0,
    2: 1.5,
    3: 2.0,
    4: 3.0,
    5: 4.0,
    6: 5.0,
  }

  constructor(private readonly defaultStake: number = 100) {}

  async createTournamentFromQueue(participants: QueueParticipant[]): Promise<ITournament> {
    const seeds: BracketSeed[] = participants.map((p) => ({
      address: p.address,
      username: p.username,
      reputation: p.reputation,
    }))

    if (seeds.length < 2) {
      throw new Error('At least two participants are required to start a tournament')
    }

    const rounds = this.buildInitialRounds(seeds)

    const tournament = new Tournament({
      status: 'pending',
      currentRound: 1,
      rounds,
      metrics: {
        totalTokensStaked: 0,
        prizePool: 0,
        reputationBonuses: {},
      },
    })

    await tournament.save()
    return tournament
  }

  buildInitialRounds(seeds: BracketSeed[]): TournamentRound[] {
    const rounds: TournamentRound[] = []
    let roundNumber = 1
    let currentSeeds = [...seeds]
    let matchCounter = 1

    while (currentSeeds.length > 1) {
      const { matches, nextSeeds, nextMatchNumber } = this.buildRound(
        currentSeeds,
        matchCounter,
        roundNumber === 1 ? undefined : roundNumber - 1
      )

      rounds.push({ roundNumber, matches })
      currentSeeds = nextSeeds
      matchCounter = nextMatchNumber
      roundNumber += 1
    }

    if (currentSeeds.length === 1) {
      rounds.push({
        roundNumber,
        matches: [
          {
            matchNumber: matchCounter,
            player1: currentSeeds[0].address,
            player1Username: currentSeeds[0].username,
            player1Reputation: currentSeeds[0].reputation,
            status: 'pending',
          },
        ],
      })
    }

    return rounds
  }

  private buildRound(
    seeds: BracketSeed[],
    startMatchNumber: number,
    sourceRound?: number
  ): RoundBuildResult {
    const matches: TournamentMatch[] = []
    const { paired, byes } = this.pairPlayersWithByes(seeds)
    let matchCounter = startMatchNumber

    paired.forEach(([player1, player2]) => {
      matches.push({
        matchNumber: matchCounter,
        matchId: undefined,
        player1: player1.address,
        player1Username: player1.username,
        player1Reputation: player1.reputation,
        player1Source: sourceRound
          ? {
              round: sourceRound,
              match: matchCounter - 1,
            }
          : undefined,
        player2: player2.address,
        player2Username: player2.username,
        player2Reputation: player2.reputation,
        player2Source: sourceRound
          ? {
              round: sourceRound,
              match: matchCounter,
            }
          : undefined,
        status: 'pending',
      })
      matchCounter += 1
    })

    byes.forEach((player) => {
      matches.push({
        matchNumber: matchCounter,
        player1: player.address,
        player1Username: player.username,
        player1Reputation: player.reputation,
        player1Source: sourceRound
          ? {
              round: sourceRound,
              match: matchCounter - 1,
            }
          : undefined,
        status: 'completed',
        winner: player.address,
        bye: true,
      })
      matchCounter += 1
    })

    const nextSeeds: BracketSeed[] = matches
      .filter((match) => match.winner)
      .map((match) => ({
        address: match.winner!,
        username:
          match.player1 === match.winner
            ? match.player1Username
            : match.player2Username || 'Winner',
        reputation:
          match.player1 === match.winner ? match.player1Reputation : match.player2Reputation || 0,
      }))

    return { matches, nextSeeds, nextMatchNumber: matchCounter }
  }

  private pairPlayersWithByes(seeds: BracketSeed[]) {
    const players = [...seeds]
    const paired: [BracketSeed, BracketSeed][] = []
    const byes: BracketSeed[] = []

    if (players.length % 2 !== 0) {
      byes.push(players.pop()!)
    }

    while (players.length >= 2) {
      const player1 = players.shift()!
      const player2 = players.pop()!
      paired.push([player1, player2])
    }

    return { paired, byes }
  }

  async assignMatchIds(tournamentId: string, roundNumber: number) {
    const tournament = await Tournament.findById(tournamentId)
    if (!tournament) throw new Error('Tournament not found')

    const round = tournament.rounds.find((r) => r.roundNumber === roundNumber)
    if (!round) throw new Error('Round not found')

    await Promise.all(
      round.matches
        .filter((match) => !match.bye && !match.matchId)
        .map(async (match) => {
          const matchId = `tournament_${tournamentId}_${roundNumber}_${match.matchNumber}`

          const dbMatch = new Match({
            matchId,
            tournamentId,
            player1Address: match.player1,
            player1Username: match.player1Username,
            player1Reputation: match.player1Reputation,
            player2Address: match.player2!,
            player2Username: match.player2Username!,
            player2Reputation: match.player2Reputation!,
            stake: this.defaultStake,
            round: roundNumber,
            status: 'pending',
          })

          await dbMatch.save()

          match.matchId = matchId
          match.status = 'pending'
        })
    )

    tournament.markModified('rounds')
    await tournament.save()
    return tournament
  }

  async recordMatchResult(
    tournamentId: string,
    roundNumber: number,
    matchId: string,
    winnerAddress: string
  ): Promise<AdvanceResult> {
    const tournament = await Tournament.findById(tournamentId)
    if (!tournament) throw new Error('Tournament not found')

    const round = tournament.rounds.find((r) => r.roundNumber === roundNumber)
    if (!round) throw new Error('Round not found')

    const match = round.matches.find((m) => m.matchId === matchId)
    if (!match) throw new Error('Match not found in round')

    match.winner = winnerAddress
    match.status = 'completed'

    const matchDoc = await Match.findOne({ matchId })
    if (matchDoc) {
      matchDoc.status = 'resolved'
      matchDoc.winner = matchDoc.player1Address === winnerAddress ? 'player1' : 'player2'
      await matchDoc.save()
    }

    this.applyRoundRewards(tournament, roundNumber, match)

    const advancingPlayers = round.matches
      .filter((m) => m.winner)
      .map((m) => ({
        address: m.winner!,
        username: m.player1 === m.winner ? m.player1Username : m.player2Username || 'Winner',
        reputation: m.player1 === m.winner ? m.player1Reputation : m.player2Reputation || 0,
      }))

    const roundCompleted = round.matches.every((m) => m.bye || m.status === 'completed')
    if (roundCompleted) {
      if (this.isFinalRound(tournament, roundNumber)) {
        this.finalizePayouts(tournament, round.matches)
      }
      tournament.currentRound = roundNumber + 1
    }

    tournament.markModified('rounds')
    tournament.markModified('metrics')
    await tournament.save()

    return { tournament, advancingPlayers, roundCompleted, roundNumber }
  }

  private applyRoundRewards(tournament: ITournament, roundNumber: number, match: TournamentMatch) {
    const stake = match.stake ?? this.defaultStake
    const multiplier = this.getRoundMultiplier(roundNumber)
    const weightedStake = stake * multiplier

    tournament.metrics.totalTokensStaked += stake
    tournament.metrics.prizePool += weightedStake

    const repBonuses = tournament.metrics.reputationBonuses
    const currentBonus = repBonuses[match.player1] ?? 0
    repBonuses[match.player1] = currentBonus + Math.floor(weightedStake * 0.1)
  }

  private finalizePayouts(tournament: ITournament, matches: TournamentMatch[]) {
    const finalMatch = matches.find((m) => !m.bye && m.winner)
    if (!finalMatch || !finalMatch.winner) return

    const winnerAddress = finalMatch.winner
    const runnerUp = finalMatch.player1 === winnerAddress ? finalMatch.player2 : finalMatch.player1
    const prizeShare = tournament.metrics.prizePool * 0.6
    const runnerShare = tournament.metrics.prizePool * 0.3

    tournament.metrics.winnerReward = { address: winnerAddress, amount: Math.floor(prizeShare) }
    if (runnerUp) {
      tournament.metrics.runnerUpReward = { address: runnerUp, amount: Math.floor(runnerShare) }
    }
    tournament.metrics.reputationBonuses[winnerAddress] =
      (tournament.metrics.reputationBonuses[winnerAddress] || 0) + 50
    if (runnerUp) {
      tournament.metrics.reputationBonuses[runnerUp] =
        (tournament.metrics.reputationBonuses[runnerUp] || 0) + 25
    }
  }

  private getRoundMultiplier(roundNumber: number) {
    return this.roundMultipliers[roundNumber] ?? 1.0
  }

  private isFinalRound(tournament: ITournament, roundNumber: number) {
    return roundNumber === tournament.rounds.length
  }

  async seedNextRound(tournamentId: string, advancingPlayers: BracketSeed[]): Promise<SeedResult> {
    const tournament = await Tournament.findById(tournamentId)
    if (!tournament) throw new Error('Tournament not found')

    const roundNumber = tournament.currentRound
    const { matches } = this.buildRound(advancingPlayers, this.nextMatchNumber(tournament), roundNumber - 1)

    tournament.rounds.push({ roundNumber, matches })
    tournament.markModified('rounds')
    tournament.currentRound = roundNumber

    await tournament.save()
    return { tournament, roundNumber, matches }
  }

  private nextMatchNumber(tournament: ITournament) {
    return tournament.rounds.reduce((sum, round) => sum + round.matches.length, 0) + 1
  }

  async getTournament(tournamentId: string) {
    const tournament = await Tournament.findById(tournamentId)
    if (!tournament) throw new Error('Tournament not found')
    return tournament
  }
}
