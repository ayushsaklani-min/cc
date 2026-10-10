import { sessionRoute } from "../../../../../../lib/http";

export const GET = (request: Request) => sessionRoute(request);
