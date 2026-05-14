import { SectionHeader } from "@/components/SectionHeader";
import OrderProcessClient from "./OrderProcessClient";
import "@/app/order-dashboard-styles.css";

export const metadata = {
  title: "Order Process Dashboard — Timion HQ",
  description: "Live view of orders moving through the pipeline — stage, type, trends and CRM links.",
};

export default function OrderProcessPage() {
  return (
    <>
      <SectionHeader
        eyebrow="CRM"
        title="Order Process Dashboard"
        subtitle="Live view of orders moving through the pipeline — stage, type, monthly trends and direct CRM links."
      />
      <OrderProcessClient />
    </>
  );
}
