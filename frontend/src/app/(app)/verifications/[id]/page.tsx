import { Suspense } from "react";
import { VerificationDetails } from "./details";

// The id is only known at request time, so it is resolved inside a Suspense boundary.
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <p role="status" className="text-muted">
          Loading…
        </p>
      }
    >
      <Resolved params={params} />
    </Suspense>
  );
}

async function Resolved({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VerificationDetails id={id} />;
}
