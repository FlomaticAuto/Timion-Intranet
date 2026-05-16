import { SectionHeader } from "@/components/SectionHeader";
import EquipmentClient from "./EquipmentClient";
import "@/app/visit-dashboard-styles.css";

export const metadata = {
  title: "Equipment Issued Dashboard — Timion HQ",
  description: "Monthly equipment issuances from Zoho CRM — volumes, devices, patients and referral sources.",
};

export default function EquipmentIssuedPage() {
  return (
    <>
      <SectionHeader
        eyebrow="CRM"
        title="Equipment Issued Dashboard"
        subtitle="Monthly equipment issuances from Zoho CRM — volumes, devices, patients and referral sources."
      />
      <EquipmentClient />
    </>
  );
}
