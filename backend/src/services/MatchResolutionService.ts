/**
 * Game theory outcome matrix for match resolution
 */
export enum Choice {
  COOPERATE = 0,
  BETRAY = 1,
  ABSTAIN = 2,
}

export interface OutcomeResult {
  player1Tokens: number
  player2Tokens: number
  player1RepChange: number
  player2RepChange: number
  description: string
}

export const outcomeMatrix: Record<string, OutcomeResult> = {
  'COOPERATE_COOPERATE': {
    player1Tokens: 50,
    player2Tokens: 50,
    player1RepChange: 10,
    player2RepChange: 10,
    description: 'Both cooperated - mutual benefit',
  },
  'COOPERATE_BETRAY': {
    player1Tokens: 0,
    player2Tokens: 100,
    player1RepChange: -20,
    player2RepChange: 5,
    description: 'Player 2 betrayed - major loss for Player 1',
  },
  'BETRAY_COOPERATE': {
    player1Tokens: 100,
    player2Tokens: 0,
    player1RepChange: 5,
    player2RepChange: -20,
    description: 'Player 1 betrayed - major loss for Player 2',
  },
  'BETRAY_BETRAY': {
    player1Tokens: 0,
    player2Tokens: 0,
    player1RepChange: -10,
    player2RepChange: -10,
    description: 'Mutual betrayal - both lose',
  },
  'ABSTAIN_ABSTAIN': {
    player1Tokens: 25,
    player2Tokens: 25,
    player1RepChange: 0,
    player2RepChange: 0,
    description: 'Both abstained - neutral outcome',
  },
  'COOPERATE_ABSTAIN': {
    player1Tokens: 25,
    player2Tokens: 25,
    player1RepChange: 0,
    player2RepChange: 0,
    description: 'One cooperated, one abstained - neutral split',
  },
  'BETRAY_ABSTAIN': {
    player1Tokens: 25,
    player2Tokens: 25,
    player1RepChange: 0,
    player2RepChange: 0,
    description: 'One betrayed, one abstained - neutral split',
  },
}

/**
 * Resolve a match between two players based on their choices
 */
export function resolveMatch(
  player1Choice: Choice,
  player2Choice: Choice
): OutcomeResult {
  const key = `${Choice[player1Choice]}_${Choice[player2Choice]}`
  return outcomeMatrix[key] || outcomeMatrix['ABSTAIN_ABSTAIN']
}

/**
 * Get choice description
 */
export function getChoiceDescription(choice: Choice): string {
  switch (choice) {
    case Choice.COOPERATE:
      return 'Cooperate'
    case Choice.BETRAY:
      return 'Betray'
    case Choice.ABSTAIN:
      return 'Abstain'
    default:
      return 'Unknown'
  }
}

/**
 * Determine winner (higher tokens win, ties return null)
 */
export function determineWinner(
  player1Tokens: number,
  player2Tokens: number
): 'player1' | 'player2' | 'tie' {
  if (player1Tokens > player2Tokens) return 'player1'
  if (player2Tokens > player1Tokens) return 'player2'
  return 'tie'
}
