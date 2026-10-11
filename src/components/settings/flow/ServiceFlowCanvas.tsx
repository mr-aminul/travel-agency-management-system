import { useEffect, useMemo, useRef } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ServiceFlowInteractionProvider } from '@/components/settings/flow/ServiceFlowInteraction'
import { serviceFlowNodeTypes } from '@/components/settings/flow/ServiceFlowNodes'
import {
  nodeIdForFlowSelection,
  sameFlowSelection,
} from '@/lib/flowSelection'
import {
  buildServiceFlowGraph,
  parseBranchExitHandleId,
  parseBranchTipNodeId,
  parseFlowSelection,
  type FlowSelection,
  type ServiceFlowEdge,
  type ServiceFlowNode,
} from '@/lib/serviceFlowGraph'
import type { DocumentFormFieldDraft } from '@/types/documentFormField'
import type {
  ServiceDocumentConfig,
  ServiceStepBranchRule,
  ServiceStepConfig,
} from '@/types/serviceTemplate'

function withSelection(
  nodes: ServiceFlowNode[],
  selection: FlowSelection | null,
): ServiceFlowNode[] {
  const selectedId = nodeIdForFlowSelection(selection)
  let changed = false
  const next = nodes.map((node) => {
    const ownsSelectedDocument =
      selection?.kind === 'document' &&
      node.type === 'step' &&
      node.data.kind === 'step' &&
      node.data.documents.some((doc) => doc.id === selection.documentId)
    const selected =
      node.id === selectedId ||
      ownsSelectedDocument ||
      (selection?.kind === 'step' &&
        node.type === 'branchTip' &&
        node.data.kind === 'branchTip' &&
        node.data.stepId === selection.stepId)
    if (Boolean(node.selected) === selected) return node
    changed = true
    return { ...node, selected }
  })
  return changed ? next : nodes
}

function ServiceFlowCanvasInner({
  steps,
  documents,
  fieldsByDocId,
  selection,
  onSelect,
  onConnectSteps,
  onWireBranch,
  onAddDocumentToStep,
  onAddStepAt,
}: {
  steps: ServiceStepConfig[]
  documents: ServiceDocumentConfig[]
  fieldsByDocId: Record<string, DocumentFormFieldDraft[]>
  selection: FlowSelection | null
  onSelect: (selection: FlowSelection | null) => void
  onConnectSteps: (fromStepId: string, toStepId: string) => void
  onWireBranch: (fromStepId: string, rule: ServiceStepBranchRule) => void
  onAddDocumentToStep: (stepId: string) => void
  onAddStepAt: (index: number) => void
}) {
  const selectionRef = useRef(selection)
  selectionRef.current = selection
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onAddDocumentToStepRef = useRef(onAddDocumentToStep)
  onAddDocumentToStepRef.current = onAddDocumentToStep
  const onAddStepAtRef = useRef(onAddStepAt)
  onAddStepAtRef.current = onAddStepAt
  const { getIntersectingNodes } = useReactFlow()

  const graph = useMemo(
    () => buildServiceFlowGraph({ steps, documents, fieldsByDocId }),
    [steps, documents, fieldsByDocId],
  )
  const graphKey = useMemo(
    () =>
      JSON.stringify({
        steps,
        documents: documents.map((doc) => ({
          id: doc.id,
          name: doc.name,
          required: doc.required,
          unlockStepId: doc.unlockStepId ?? '',
        })),
        fields: Object.fromEntries(
          Object.entries(fieldsByDocId).map(([id, fields]) => [
            id,
            fields.map((field) => ({
              key: field.key,
              label: field.label,
              type: field.type,
              options: field.options ?? [],
            })),
          ]),
        ),
      }),
    [steps, documents, fieldsByDocId],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<ServiceFlowNode>(
    withSelection(graph.nodes, selection),
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<ServiceFlowEdge>(
    graph.edges,
  )

  useEffect(() => {
    setNodes((current) => {
      const positionById = new Map(
        current.map((node) => [node.id, node.position]),
      )
      return withSelection(
        graph.nodes.map((node) => ({
          ...node,
          // Branch tips / insert slots always re-layout with the graph.
          // Steps keep any manual drag position across data syncs.
          position:
            node.type === 'branchTip' || node.type === 'insertSlot'
              ? node.position
              : (positionById.get(node.id) ?? node.position),
        })),
        selectionRef.current,
      )
    })
    setEdges(graph.edges)
    // graphKey tracks meaningful data changes; graph object itself is derived.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only when template data changes
  }, [graphKey, setNodes, setEdges])

  useEffect(() => {
    setNodes((current) => withSelection(current, selection))
  }, [selection, setNodes])

  const selectIfChanged = (next: FlowSelection | null) => {
    if (sameFlowSelection(selectionRef.current, next)) return
    onSelect(next)
  }

  const handleNodeClick: NodeMouseHandler<Node> = (_event, node) => {
    selectIfChanged(parseFlowSelection(node.id))
  }

  const handlePaneClick = () => {
    selectIfChanged(null)
  }

  const handleTipDropOnStep: OnNodeDrag<ServiceFlowNode> = (_event, node) => {
    const tip = parseBranchTipNodeId(node.id)
    if (!tip) return
    const width = node.measured?.width ?? 22
    const height = node.measured?.height ?? 22
    const pad = 20
    const hit = getIntersectingNodes({
      x: node.position.x - pad,
      y: node.position.y - pad,
      width: width + pad * 2,
      height: height + pad * 2,
    }).find((candidate) => {
      if (!candidate.id.startsWith('step:')) return false
      return candidate.id.slice('step:'.length) !== tip.stepId
    })
    if (!hit) return
    onWireBranch(tip.stepId, {
      documentId: tip.documentId,
      fieldKey: tip.fieldKey,
      equals: tip.equals,
      nextStepId: hit.id.slice('step:'.length),
    })
  }

  const handleConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) return
    const source = connection.source
    const target = connection.target

    if (source.startsWith('step:') && target.startsWith('step:')) {
      const fromStepId = source.slice('step:'.length)
      const toStepId = target.slice('step:'.length)
      const exit = parseBranchExitHandleId(connection.sourceHandle)
      if (exit && fromStepId !== toStepId) {
        onWireBranch(fromStepId, {
          documentId: exit.documentId,
          fieldKey: exit.fieldKey,
          equals: exit.equals,
          nextStepId: toStepId,
        })
        return
      }
      onConnectSteps(fromStepId, toStepId)
    }
  }

  const isValidConnection = (connection: Connection | Edge) => {
    const source = connection.source ?? ''
    const target = connection.target ?? ''
    if (!source || !target || source === target) return false
    if (source.startsWith('branch-tip:') || target.startsWith('branch-tip:')) {
      return false
    }
    return source.startsWith('step:') && target.startsWith('step:')
  }

  const interaction = useMemo(
    () => ({
      selectedDocumentId:
        selection?.kind === 'document' ? selection.documentId : null,
      selectDocument: (documentId: string) => {
        onSelectRef.current({ kind: 'document', documentId })
      },
      addDocumentToStep: (stepId: string) => {
        onAddDocumentToStepRef.current(stepId)
      },
      addStepAt: (index: number) => {
        onAddStepAtRef.current(index)
      },
    }),
    [selection],
  )

  return (
    <ServiceFlowInteractionProvider value={interaction}>
      <ReactFlow
        className="pd-service-flow__canvas"
        nodes={nodes}
        edges={edges}
        nodeTypes={serviceFlowNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleTipDropOnStep}
        onPaneClick={handlePaneClick}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        defaultViewport={{ x: 40, y: 40, zoom: 0.85 }}
        minZoom={0.35}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        nodesConnectable
        nodesDraggable
        elementsSelectable
        selectNodesOnDrag={false}
        deleteKeyCode={null}
      >
        <Background
          id="dots"
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.25}
          color="color-mix(in srgb, var(--color-text) 14%, transparent)"
        />
        <Controls
          showInteractive={false}
          className="pd-service-flow__controls"
        />
        <MiniMap
          className="pd-service-flow__minimap"
          pannable
          zoomable
          maskColor="color-mix(in srgb, var(--color-bg) 72%, transparent)"
        />
      </ReactFlow>
    </ServiceFlowInteractionProvider>
  )
}

export function ServiceFlowCanvas(props: {
  steps: ServiceStepConfig[]
  documents: ServiceDocumentConfig[]
  fieldsByDocId: Record<string, DocumentFormFieldDraft[]>
  selection: FlowSelection | null
  onSelect: (selection: FlowSelection | null) => void
  onConnectSteps: (fromStepId: string, toStepId: string) => void
  onWireBranch: (fromStepId: string, rule: ServiceStepBranchRule) => void
  onAddDocumentToStep: (stepId: string) => void
  onAddStepAt: (index: number) => void
}) {
  return (
    <ReactFlowProvider>
      <ServiceFlowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
