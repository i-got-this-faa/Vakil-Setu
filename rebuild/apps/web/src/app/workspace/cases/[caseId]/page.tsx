import { CasePage } from "@/components/cases";
export default async function Page({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  return <CasePage caseId={(await params).caseId} />;
}
