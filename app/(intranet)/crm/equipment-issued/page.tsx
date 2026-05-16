import { SectionHeader } from "@/components/SectionHeader";
import EquipmentClient from "./EquipmentClient";
import "@/app/visit-dashboard-styles.css";

export const metadata = {
  title: "Equipment Ordered Dashboard — Timion HQ",
  description: "Monthly equipment orders from Zoho CRM — pipeline, approval status, devices and referral sources.",
};

export default function EquipmentIssuedPage() {
  return (
    <>
      <SectionHeader
        eyebrow="CRM"
        title="Equipment Ordered Dashboard"
        subtitle="Monthly equipment orders from Zoho CRM — pipeline, approval status, devices and referral sources."
      />
      <EquipmentClient />
    </>
  );
}
