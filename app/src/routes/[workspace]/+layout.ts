import { previewWorkspace } from "../../lib/preview/catalog";

export const prerender = true;

export function load({ params }: { params: { workspace: string } }): {
  workspace: ReturnType<typeof previewWorkspace>;
} {
  return { workspace: previewWorkspace(params.workspace) };
}
