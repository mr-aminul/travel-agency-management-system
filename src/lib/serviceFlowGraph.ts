import type { Edge, Node } from '@xyflow/react'
import { listBranchSlotsForStep } from '@/lib/serviceBranchFields'
import type { DocumentFormFieldDraft } from '@/types/documentFormField'
import type {
  ServiceDocumentConfig,
  ServiceStepConfig,
} from '@/types/serviceTemplate'

export type FlowSelection =
  | { kind: 'step'; stepId: string }
  | { kind: 'document'; documentId: string }

export type StepBranchExit = {
  handleId: string
  label: string
}

export type StepNestedDocument = {
  id: string
  name: string
  required: boolean
  fieldCount: number
}

export type StepFlowNodeData = {
  kind: 'step'
  stepId: string
  label: string
  index: number
  documents: StepNestedDocument[]
  branchCount: number
  branchExits: StepBranchExit[]
  autoNotifySms?: boolean
  autoNotifyEmail?: boolean
}

export type BranchTipFlowNodeData = {
  kind: 'branchTip'
  stepId: string
  documentId: string
  fieldKey: string
  fieldLabel: string
  equals: string
}

export type InsertSlotFlowNodeData = {
  kind: 'insertSlot'
  /** Index in the steps array where a new step would be inserted. */
  index: number
  /** True when the canvas has no steps yet. */
  empty?: boolean
}

export type ServiceFlowNodeData =
  | StepFlowNodeData
  | BranchTipFlowNodeData
  | InsertSlotFlowNodeData

export type ServiceFlowNode = Node<ServiceFlowNodeData>
export type ServiceFlowEdge = Edge<
  {
    kind: 'sequence' | 'branch' | 'branchStub'
  },
  'smoothstep'
> & {
  pathOptions?: {
    offset?: number
    borderRadius?: number
    stepPosition?: number
  }
}

const STEP_WIDTH = 280
const STEP_GAP_X = 96
const STEP_Y = 120
const BRANCH_TIP_GAP_Y = 56
const BRANCH_TIP_GAP_X = 28
/** Hang stubs under / beside the step card, not in the sequence corridor. */
const BRANCH_TIP_OFFSET_X = 36
/** Tips hang below the Documents footer by default. */
const BRANCH_TIP_BASE_PAD = 118
const NESTED_DOC_ROW = 36
const INSERT_SLOT_WIDTH = 44
const INSERT_SLOT_Y = STEP_Y + 36

export const STEP_SEQ_HANDLE = 'seq'

function stepNodeId(stepId: string) {
  return `step:${stepId}`
}

function insertSlotId(index: number) {
  return `flow:insert:${index}`
}

export function branchExitHandleId(slot: {
  documentId: string
  fieldKey: string
  equals: string
}) {
  return `branch:${slot.documentId}:${slot.fieldKey}:${encodeURIComponent(slot.equals)}`
}

export function parseBranchExitHandleId(handleId: string | null | undefined): {
  documentId: string
  fieldKey: string
  equals: string
} | null {
  if (!handleId?.startsWith('branch:')) return null
  const rest = handleId.slice('branch:'.length)
  const [documentId = '', fieldKey = '', encoded = ''] = rest.split(':')
  if (!documentId || !fieldKey) return null
  return {
    documentId,
    fieldKey,
    equals: decodeURIComponent(encoded),
  }
}

export function branchTipNodeId(slot: {
  stepId: string
  documentId: string
  fieldKey: string
  equals: string
}) {
  return `branch-tip:${slot.stepId}:${slot.documentId}:${slot.fieldKey}:${encodeURIComponent(slot.equals)}`
}

export function parseBranchTipNodeId(nodeId: string): {
  stepId: string
  documentId: string
  fieldKey: string
  equals: string
} | null {
  if (!nodeId.startsWith('branch-tip:')) return null
  const rest = nodeId.slice('branch-tip:'.length)
  const [stepId = '', documentId = '', fieldKey = '', encoded = ''] =
    rest.split(':')
  if (!stepId || !documentId || !fieldKey) return null
  return {
    stepId,
    documentId,
    fieldKey,
    equals: decodeURIComponent(encoded),
  }
}

export function parseFlowSelection(nodeId: string): FlowSelection | null {
  if (nodeId.startsWith('flow:insert:')) return null
  if (nodeId.startsWith('step:')) {
    return { kind: 'step', stepId: nodeId.slice('step:'.length) }
  }
  if (nodeId.startsWith('doc:')) {
    return { kind: 'document', documentId: nodeId.slice('doc:'.length) }
  }
  const tip = parseBranchTipNodeId(nodeId)
  if (tip) return { kind: 'step', stepId: tip.stepId }
  return null
}

export function buildServiceFlowGraph({
  steps,
  documents,
  fieldsByDocId,
}: {
  steps: ServiceStepConfig[]
  documents: ServiceDocumentConfig[]
  fieldsByDocId: Record<string, DocumentFormFieldDraft[]>
}): { nodes: ServiceFlowNode[]; edges: ServiceFlowEdge[] } {
  const nodes: ServiceFlowNode[] = []

  steps.forEach((step, index) => {
    const needed = (step.requiredDocumentIds ?? [])
      .map((id) => documents.find((doc) => doc.id === id))
      .filter((doc): doc is ServiceDocumentConfig => Boolean(doc))
    const branchSlots = listBranchSlotsForStep(step, documents, fieldsByDocId)
    const stepX = index * (STEP_WIDTH + STEP_GAP_X)
    const branchExits = branchSlots.map((slot) => ({
      handleId: branchExitHandleId(slot),
      label: `${slot.fieldLabel} = ${slot.equals}`,
    }))
    const nestedDocsHeight =
      BRANCH_TIP_BASE_PAD + Math.max(needed.length, 1) * NESTED_DOC_ROW
    nodes.push({
      id: stepNodeId(step.id),
      type: 'step',
      position: {
        x: stepX,
        y: STEP_Y,
      },
      data: {
        kind: 'step',
        stepId: step.id,
        label: step.label,
        index,
        documents: needed.map((doc) => ({
          id: doc.id,
          name: doc.name,
          required: doc.required,
          fieldCount: fieldsByDocId[doc.id]?.length ?? 0,
        })),
        branchCount: branchSlots.length,
        branchExits,
        ...(step.autoNotify?.sms ? { autoNotifySms: true } : {}),
        ...(step.autoNotify?.email ? { autoNotifyEmail: true } : {}),
      },
    })

    const openSlots = branchSlots.filter((slot) => !slot.nextStepId)
    openSlots.forEach((slot, openIndex) => {
      const tipId = branchTipNodeId({
        stepId: step.id,
        documentId: slot.documentId,
        fieldKey: slot.fieldKey,
        equals: slot.equals,
      })
      nodes.push({
        id: tipId,
        type: 'branchTip',
        position: {
          x:
            stepX +
            STEP_WIDTH +
            BRANCH_TIP_OFFSET_X +
            openIndex * BRANCH_TIP_GAP_X,
          y: STEP_Y + nestedDocsHeight + openIndex * BRANCH_TIP_GAP_Y,
        },
        data: {
          kind: 'branchTip',
          stepId: step.id,
          documentId: slot.documentId,
          fieldKey: slot.fieldKey,
          fieldLabel: slot.fieldLabel,
          equals: slot.equals,
        },
        draggable: true,
        connectable: false,
        zIndex: 5,
      })
    })
  })

  const edges: ServiceFlowEdge[] = []

  steps.forEach((step, index) => {
    const next = steps[index + 1]
    const branchSlots = listBranchSlotsForStep(step, documents, fieldsByDocId)

    if (next) {
      edges.push({
        id: `seq:${step.id}-${next.id}`,
        source: stepNodeId(step.id),
        sourceHandle: STEP_SEQ_HANDLE,
        target: stepNodeId(next.id),
        type: 'smoothstep',
        label: branchSlots.length
          ? `Otherwise → ${next.label?.trim() || next.id}`
          : undefined,
        data: { kind: 'sequence' },
        className: 'pd-service-flow__edge pd-service-flow__edge--sequence',
      })
    }

    let openStubIndex = 0
    for (const [slotIndex, slot] of branchSlots.entries()) {
      const label = `${slot.fieldLabel} = ${slot.equals}`
      const sourceHandle = branchExitHandleId(slot)
      if (slot.nextStepId) {
        const targetStep = steps.find((item) => item.id === slot.nextStepId)
        if (!targetStep) continue
        edges.push({
          id: `branch:${step.id}:${slot.documentId}:${slot.fieldKey}:${encodeURIComponent(slot.equals)}:${slot.nextStepId}`,
          source: stepNodeId(step.id),
          sourceHandle,
          target: stepNodeId(targetStep.id),
          type: 'smoothstep',
          label,
          data: { kind: 'branch' },
          className: 'pd-service-flow__edge pd-service-flow__edge--sequence',
          pathOptions: { offset: 36 + slotIndex * 20 },
          style: { zIndex: slotIndex + 1 },
        })
        continue
      }
      const tipId = branchTipNodeId({
        stepId: step.id,
        documentId: slot.documentId,
        fieldKey: slot.fieldKey,
        equals: slot.equals,
      })
      edges.push({
        id: `branch-stub:${step.id}:${slot.documentId}:${slot.fieldKey}:${encodeURIComponent(slot.equals)}`,
        source: stepNodeId(step.id),
        sourceHandle,
        target: tipId,
        type: 'smoothstep',
        label,
        data: { kind: 'branchStub' },
        className: 'pd-service-flow__edge pd-service-flow__edge--sequence',
        pathOptions: { offset: 28 + openStubIndex * 18 },
        style: { zIndex: slotIndex + 1 },
      })
      openStubIndex += 1
    }
  })

  const insertCount = steps.length === 0 ? 1 : steps.length + 1
  for (let index = 0; index < insertCount; index += 1) {
    nodes.push({
      id: insertSlotId(index),
      type: 'insertSlot',
      position: {
        x:
          steps.length === 0
            ? 0
            : index * (STEP_WIDTH + STEP_GAP_X) -
              STEP_GAP_X / 2 -
              INSERT_SLOT_WIDTH / 2,
        y: steps.length === 0 ? STEP_Y : INSERT_SLOT_Y,
      },
      data: {
        kind: 'insertSlot',
        index,
        empty: steps.length === 0,
      },
      draggable: false,
      connectable: false,
      selectable: false,
      zIndex: 8,
    })
  }

  return { nodes, edges }
}
