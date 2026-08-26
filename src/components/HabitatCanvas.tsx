import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Connection as FlowConnection,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import { useMemo } from "react";
import { MODULE_CATALOG } from "../domain/catalog";
import type { ResourceKind } from "../domain/types";
import { edenStore, useEdenStore } from "../store/edenStore";
import { ModuleNode, type ModuleNodeData } from "./ModuleNode";

const nodeTypes: NodeTypes = { module: ModuleNode };

function edgeLabel(resource: ResourceKind): string {
  return resource === "wastewater" ? "waste" : resource;
}

export function HabitatCanvas() {
  const design = useEdenStore((current) => current.design);
  const selectedModuleId = useEdenStore((current) => current.selectedModuleId);

  const nodes = useMemo<Node<ModuleNodeData>[]>(
    () =>
      design.modules.map((module) => ({
        id: module.id,
        type: "module",
        position: module.position,
        selected: selectedModuleId === module.id,
        data: { module, spec: MODULE_CATALOG[module.kind] },
      })),
    [design.modules, selectedModuleId],
  );

  const edges = useMemo<Edge[]>(
    () =>
      design.connections.map((connection) => ({
        id: connection.id,
        source: connection.source,
        target: connection.target,
        sourceHandle: `out:${connection.resource}`,
        targetHandle: `in:${connection.resource}`,
        label: edgeLabel(connection.resource),
        className: `flow-edge resource-${connection.resource}`,
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
    [design.connections],
  );

  const onConnect = (connection: FlowConnection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle) return;
    const [, resource] = connection.sourceHandle.split(":");
    if (!resource) return;
    try {
      edenStore.actions.connectModules(
        connection.source,
        connection.target,
        resource as ResourceKind,
        "human",
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    }
  };

  const reportActionError = (error: unknown) => {
    window.alert(error instanceof Error ? error.message : String(error));
  };

  return (
    <section className="canvas-shell" aria-label="Habitat design canvas">
      <div className="canvas-grid-label">
        LIVE HABITAT GRAPH · DESIGN v{design.version}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onNodeClick={(_, node) => edenStore.actions.setSelectedModule(node.id)}
        onPaneClick={() => edenStore.actions.setSelectedModule(null)}
        onNodeDragStop={(_, node) =>
          edenStore.actions.updateModule(node.id, { position: node.position }, "human")
        }
        onNodesDelete={(deleted) => {
          for (const node of deleted) {
            try {
              edenStore.actions.removeModule(node.id, "human");
            } catch (error) {
              reportActionError(error);
            }
          }
        }}
        onEdgesDelete={(deleted) =>
          deleted.forEach((edge) => {
            try {
              edenStore.actions.removeConnection(edge.id, "human");
            } catch (error) {
              reportActionError(error);
            }
          })
        }
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.35}
        maxZoom={1.5}
        deleteKeyCode={["Backspace", "Delete"]}
        aria-label="Interactive habitat resource graph"
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </section>
  );
}
