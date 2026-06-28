import { Route } from "@booploops/pod-router";

export const WorkspacePanels: Route[] = [
  {
    path: "test",
    component: () => import("pages/TestPage.vue"),
  },
];
