export type NebulaNodeType = "total" | "branch" | "member";

export interface NebulaNode {
  id: string;
  name: string;
  type: NebulaNodeType;
  value?: number | string;
  status?: "active" | "warning" | "idle";
  children?: NebulaNode[];
  parentId?: string;
}

export interface NebulaState {
  currentView: "total" | "branch" | "member";
  activeNodeId: string | null;
  history: string[];
}
