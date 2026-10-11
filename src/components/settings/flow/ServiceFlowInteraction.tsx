import { createContext, useContext, type ReactNode } from 'react'

export type ServiceFlowInteraction = {
  selectedDocumentId: string | null
  selectDocument: (documentId: string) => void
  addDocumentToStep: (stepId: string) => void
  addStepAt: (index: number) => void
}

const ServiceFlowInteractionContext =
  createContext<ServiceFlowInteraction | null>(null)

export function ServiceFlowInteractionProvider({
  value,
  children,
}: {
  value: ServiceFlowInteraction
  children: ReactNode
}) {
  return (
    <ServiceFlowInteractionContext.Provider value={value}>
      {children}
    </ServiceFlowInteractionContext.Provider>
  )
}

export function useServiceFlowInteraction() {
  return useContext(ServiceFlowInteractionContext)
}
