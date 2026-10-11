import { describe, expect, it } from 'vitest'
import {
  buildServiceFlowGraph,
  parseFlowSelection,
} from '@/lib/serviceFlowGraph'

describe('service flow graph', () => {
  it('builds steps with insert slots before, between, and after', () => {
    const { nodes, edges } = buildServiceFlowGraph({
      steps: [
        {
          id: 'intake',
          label: 'Intake',
          requiredDocumentIds: ['passport'],
          branchRules: [
            {
              documentId: 'passport',
              fieldKey: 'result',
              equals: 'Fit',
              nextStepId: 'done',
            },
          ],
        },
        { id: 'medical', label: 'Medical' },
        { id: 'done', label: 'Done' },
      ],
      documents: [
        { id: 'passport', name: 'Passport', required: true, unlockStepId: 'intake' },
        { id: 'receipt', name: 'Receipt', required: false },
      ],
      fieldsByDocId: {
        passport: [
          {
            key: 'result',
            label: 'Result',
            type: 'select',
            required: true,
            options: ['Fit', 'Unfit'],
          },
        ],
      },
    })

    expect(nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining([
        'step:intake',
        'step:medical',
        'step:done',
        'flow:insert:0',
        'flow:insert:1',
        'flow:insert:2',
        'flow:insert:3',
      ]),
    )
    expect(nodes.filter((node) => node.type === 'insertSlot')).toHaveLength(4)
    expect(nodes.some((node) => node.type === 'addStep')).toBe(false)
    expect(edges.some((edge) => edge.id.endsWith('-add'))).toBe(false)
    expect(edges.some((edge) => edge.id.startsWith('branch:'))).toBe(true)

    const intake = nodes.find((node) => node.id === 'step:intake')
    expect(intake?.data.kind === 'step' && intake.data.branchCount).toBe(2)
    expect(intake?.data.kind === 'step' && intake.data.documents).toEqual([
      {
        id: 'passport',
        name: 'Passport',
        required: true,
        fieldCount: 1,
      },
    ])

    const tip = nodes.find((node) => node.type === 'branchTip')
    expect(tip?.draggable).toBe(true)
    expect(tip?.connectable).toBe(false)
    const stub = edges.find((edge) => edge.data?.kind === 'branchStub')
    expect(stub?.label).toContain('Result = Unfit')
    expect(stub?.sourceHandle).toMatch(/^branch:/)
  })

  it('shows a single empty insert slot when there are no steps', () => {
    const { nodes } = buildServiceFlowGraph({
      steps: [],
      documents: [],
      fieldsByDocId: {},
    })
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({
      id: 'flow:insert:0',
      type: 'insertSlot',
      data: { kind: 'insertSlot', index: 0, empty: true },
    })
  })

  it('parses canvas selection ids', () => {
    expect(parseFlowSelection('flow:insert:1')).toBeNull()
    expect(parseFlowSelection('step:intake')).toEqual({
      kind: 'step',
      stepId: 'intake',
    })
    expect(parseFlowSelection('doc:passport')).toEqual({
      kind: 'document',
      documentId: 'passport',
    })
  })
})
