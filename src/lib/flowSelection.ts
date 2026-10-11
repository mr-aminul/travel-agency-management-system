import type { FlowSelection } from '@/lib/serviceFlowGraph'

export function flowSelectionKey(selection: FlowSelection | null): string {
  if (!selection) return ''
  if (selection.kind === 'step') return `step:${selection.stepId}`
  if (selection.kind === 'document') return `doc:${selection.documentId}`
  return ''
}

export function nodeIdForFlowSelection(
  selection: FlowSelection | null,
): string | null {
  if (!selection) return null
  if (selection.kind === 'step') return `step:${selection.stepId}`
  // Documents live inside step nodes; canvas highlights the owning step separately.
  if (selection.kind === 'document') return null
  return null
}

export function sameFlowSelection(
  left: FlowSelection | null,
  right: FlowSelection | null,
): boolean {
  return flowSelectionKey(left) === flowSelectionKey(right)
}
