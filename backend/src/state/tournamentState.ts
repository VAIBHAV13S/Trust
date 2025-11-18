let activeTournamentId: string | null = null

export const setActiveTournamentId = (id: string | null) => {
  activeTournamentId = id
}

export const getActiveTournamentId = () => activeTournamentId
