import { Suspense } from "react";

import { HomeExperience } from "@/components/home-experience";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomeExperience />
    </Suspense>
  );
}
