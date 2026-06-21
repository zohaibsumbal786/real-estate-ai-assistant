import { Suspense } from "react";
import RegisterPage from "./register-client";

export default function RegisterRoute() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center">Loading...</main>}>
      <RegisterPage />
    </Suspense>
  );
}
