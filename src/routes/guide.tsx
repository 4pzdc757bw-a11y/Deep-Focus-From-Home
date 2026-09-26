import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/guide")({ component: GuideLayout });

function GuideLayout() {
  return <Outlet />;
}
