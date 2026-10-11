import { statusRoute } from "../../../../../../../lib/http";

export async function GET(request: Request, { params }: { params: Promise<{ subject: string }> }) {
  return statusRoute((await params).subject, undefined, new URL(request.url).searchParams.get("policy") ?? undefined);
}
