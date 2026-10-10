import { statusRoute } from "../../../../../../../lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ subject: string }> }) {
  return statusRoute((await params).subject);
}
