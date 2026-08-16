import { getChatGPTUser } from "@/app/chatgpt-auth";
import { LegalWorkspace } from "@/components/legal-workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const identityAvailable = Boolean(await getChatGPTUser());
  return <LegalWorkspace identityAvailable={identityAvailable} />;
}
