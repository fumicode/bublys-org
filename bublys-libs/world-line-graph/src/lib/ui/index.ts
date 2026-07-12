// UI layer — world line graph 可視化コンポーネント
export { WorldLineView, type WorldLineViewProps } from "./WorldLineView.js";
export { WorldLineTreeView, type WorldLineTreeViewProps } from "./WorldLineTreeView.js";
export {
  computeTreeLayout,
  type TreeLayout,
  type TreeNodeLayout,
  type TreeEdge,
} from "./treeLayout.js";
export {
  computeOrganicTree,
  DEFAULT_ORGANIC_TREE_OPTIONS,
  type OrganicTree,
  type OrganicEdge,
  type OrganicLeaf,
  type OrganicApex,
  type OrganicPetal,
  type OrganicTreeOptions,
} from "./organicTree.js";
