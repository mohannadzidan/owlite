import { createFileRoute } from "@tanstack/react-router";
import HomeClient from "@/home-client";

export const Route = createFileRoute("/")({
  component: HomeClient,
});
