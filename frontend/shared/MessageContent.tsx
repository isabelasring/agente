import ChatMarkdown from "./ChatMarkdown";

type Props = {
  role: "user" | "assistant";
  content: string;
};

export function MessageContent({ role, content }: Props) {
  if (role === "assistant") {
    return <ChatMarkdown content={content} />;
  }
  return <>{content}</>;
}
