import { AdvocatePublicPage } from "@/components/discovery";
export default async function Page({
  params,
}: {
  params: Promise<{ advocateId: string }>;
}) {
  return <AdvocatePublicPage advocateId={(await params).advocateId} />;
}
