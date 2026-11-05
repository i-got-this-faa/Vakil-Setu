import { ChatbotConversationPage } from "@/components/chatbot";

export default async function Page({ params }: { params: Promise<{ caseId: string }> }) {
  return <ChatbotConversationPage caseId={(await params).caseId} />;
}
