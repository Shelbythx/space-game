import type { ReactNode } from 'react'
import { AdvisorContext, useAdvisorState } from './useAdvisorState'

/** One mentor chat per open mission (D111); goes inside the mission frame. */
export function AdvisorProvider({ children }: { children: ReactNode }) {
  const state = useAdvisorState()
  return <AdvisorContext.Provider value={state}>{children}</AdvisorContext.Provider>
}
