import { zkArtifactRoute } from "../../../../../../../lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; file: string }> }) {
  const { kind, file } = await params;
  return zkArtifactRoute(kind, file);
}
