import { createFileRoute } from "@tanstack/react-router";
import { MainPortalApp } from "../components/MainPortalApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مرزا محمد مشتاق اینڈ کمپنی — پورٹل (ریپیکنگ و گیٹ پاس)" },
      {
        name: "description",
        content:
          "مرزا محمد مشتاق اینڈ کمپنی، فیصل آباد — ریپیکنگ (مال کی تیاری) اور آؤٹ ورڈ و ان ورڈ گیٹ پاس سسٹم۔",
      },
    ],
  }),
  component: MainPortalApp,
});
