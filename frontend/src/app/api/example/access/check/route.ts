import { accessCheckRoute } from "../../../../../../../lib/http";

export const POST = (request: Request) => accessCheckRoute(request);
