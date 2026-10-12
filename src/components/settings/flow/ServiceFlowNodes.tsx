import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FileText, GitBranch, Mail, MessageSquare, Plus } from 'lucide-react'
import { useServiceFlowInteraction } from '@/components/settings/flow/ServiceFlowInteraction'
import { cx } from '@/lib/cx'
import type {
  BranchTipFlowNodeData,
  InsertSlotFlowNodeData,
  StepFlowNodeData,
} from '@/lib/serviceFlowGraph'

export const StepFlowNode = memo(function StepFlowNode({
  data,
  selected,
}: NodeProps & { data: StepFlowNodeData }) {
  const interaction = useServiceFlowInteraction()
  const branchExits = data.branchExits ?? []
  const selectedDocumentId = interaction?.selectedDocumentId ?? null

  return (
    <div
      className={`pd-service-flow-node pd-service-flow-node--step${selected ? ' is-selected' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="pd-service-flow-handle" />
      <div className="pd-service-flow-node__main">
        <div className="pd-service-flow-node__head">
          <span className="pd-service-flow-node__index" aria-hidden>
            {data.index + 1}
          </span>
          <span className="pd-service-flow-node__title">
            {data.label?.trim() || 'Untitled step'}
          </span>
          {data.branchCount > 0 ? (
            <span className="pd-service-flow-node__badge" title="Branch rules">
              <GitBranch size={12} strokeWidth={2.25} aria-hidden />
              {data.branchCount}
            </span>
          ) : null}
          {data.autoNotifySms || data.autoNotifyEmail ? (
            <span
              className="pd-service-flow-node__notify"
              title="Auto send on this status"
            >
              {data.autoNotifySms ? (
                <MessageSquare size={12} strokeWidth={2.25} aria-label="SMS" />
              ) : null}
              {data.autoNotifyEmail ? (
                <Mail size={12} strokeWidth={2.25} aria-label="Email" />
              ) : null}
            </span>
          ) : null}
        </div>
      </div>

      <div className="pd-service-flow-node__docs">
        <div className="pd-service-flow-node__docs-bar">
          <div className="pd-service-flow-node__docs-label">
            <FileText size={13} strokeWidth={2.25} aria-hidden />
            <span>Documents</span>
            {data.documents.length > 0 ? (
              <span className="pd-service-flow-node__docs-count">
                {data.documents.length}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className="nodrag nopan pd-service-flow-node__docs-add"
            aria-label="Add document to this step"
            title="Add document"
            onClick={(event) => {
              event.stopPropagation()
              interaction?.addDocumentToStep(data.stepId)
            }}
          >
            <Plus size={12} strokeWidth={2.5} aria-hidden />
          </button>
        </div>
        {data.documents.length === 0 ? (
          <p className="pd-service-flow-node__docs-empty">
            None yet — attach in the inspector.
          </p>
        ) : (
          <ul className="pd-service-flow-node__docs-list">
            {data.documents.map((doc) => {
              const isDocSelected = selectedDocumentId === doc.id
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    className={`nodrag nopan pd-service-flow-node__doc-row${isDocSelected ? ' is-selected' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      interaction?.selectDocument(doc.id)
                    }}
                  >
                    {doc.name?.trim() || 'Untitled'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Handle
        type="source"
        id="seq"
        position={Position.Right}
        className="pd-service-flow-handle pd-service-flow-handle--seq"
        style={{ top: '34%' }}
      />
      {branchExits.map((exit, exitIndex) => (
        <Handle
          key={exit.handleId}
          type="source"
          id={exit.handleId}
          position={Position.Right}
          className="pd-service-flow-handle pd-service-flow-handle--branch-exit"
          title={exit.label}
          style={{ top: `${58 + exitIndex * 12}%` }}
        />
      ))}
    </div>
  )
})

/**
 * Free end of an unwired branch stub. Drag the tip to move the line;
 * drop it on a step to wire the branch.
 */
export const BranchTipFlowNode = memo(function BranchTipFlowNode({
  data,
  selected,
}: NodeProps & { data: BranchTipFlowNodeData }) {
  return (
    <div
      className={`pd-service-flow-branch-tip${selected ? ' is-selected' : ''}`}
      title={`Drag to move, drop on a step: ${data.fieldLabel} = ${data.equals}`}
      aria-label={`Wire branch ${data.fieldLabel} = ${data.equals}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="pd-service-flow-branch-tip__handle pd-service-flow-branch-tip__handle--in"
        isConnectable={false}
      />
      <span className="pd-service-flow-branch-tip__dot" aria-hidden />
    </div>
  )
})

function StepSkeleton({ label }: { label: string }) {
  return (
    <div className="pd-service-flow-insert__skeleton" aria-hidden>
      <div className="pd-service-flow-insert__skeleton-main">
        <span className="pd-service-flow-insert__skeleton-chip" />
        <span className="pd-service-flow-insert__skeleton-title">{label}</span>
      </div>
      <div className="pd-service-flow-insert__skeleton-docs">
        <span className="pd-service-flow-insert__skeleton-line" />
        <span className="pd-service-flow-insert__skeleton-line" />
      </div>
    </div>
  )
}

export const InsertSlotFlowNode = memo(function InsertSlotFlowNode({
  data,
}: NodeProps & { data: InsertSlotFlowNodeData }) {
  const interaction = useServiceFlowInteraction()
  const [hot, setHot] = useState(Boolean(data.empty))
  const [preview, setPreview] = useState(false)
  const label = data.index === 0 ? 'New first step' : 'New step'

  return (
    <div
      className={cx(
        'pd-service-flow-insert',
        data.empty && 'pd-service-flow-insert--empty',
        hot && 'is-hot',
        preview && 'is-preview',
      )}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => {
        setHot(false)
        setPreview(false)
      }}
    >
      {preview || data.empty ? <StepSkeleton label={label} /> : null}
      <button
        type="button"
        className="nodrag nopan pd-service-flow-insert__plus"
        aria-label={
          data.empty
            ? 'Add first step'
            : data.index === 0
              ? 'Insert step at the start'
              : `Insert step at position ${data.index + 1}`
        }
        title="Add step here"
        onMouseEnter={() => setPreview(true)}
        onMouseLeave={() => setPreview(false)}
        onClick={(event) => {
          event.stopPropagation()
          interaction?.addStepAt(data.index)
        }}
      >
        <Plus size={14} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  )
})

export const serviceFlowNodeTypes = {
  step: StepFlowNode,
  branchTip: BranchTipFlowNode,
  insertSlot: InsertSlotFlowNode,
}
