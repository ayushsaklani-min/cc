import { connection } from "next/server";
import { configRoute } from "../../../../../../lib/http";

export async function GET(request: Request) {
  await connection();
  return configRoute(undefined, new URL(request.url).searchParams.get("policy") ?? undefined);
}
