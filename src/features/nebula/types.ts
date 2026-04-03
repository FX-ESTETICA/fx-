export type NebulaNodeType = "total" | "branch" | "member";

export interface NebulaNode {
  id: string;
  name: string;
  type: NebulaNodeType;
  value: string;
  children?: NebulaNode[];
}
