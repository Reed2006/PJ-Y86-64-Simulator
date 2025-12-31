import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Loader2, Trash2, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface AIAssistantPanelProps {
  currentCode?: string;
}

export const AIAssistantPanel = ({ currentCode = "" }: AIAssistantPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [includeContext, setIncludeContext] = useState(false);

  const handleSendQuestion = async () => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: {
          question: userMessage.content,
          context: includeContext ? currentCode : undefined,
        },
      });

      if (error) {
        throw error;
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "AI助手回答失败";
      toast.error(errorMessage);
      
      const errorResponse: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `错误: ${errorMessage}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    toast.success("对话记录已清空");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  };

  return (
    <div className="h-full flex flex-col bg-background/50 backdrop-blur-sm border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-cyan-400">AI 代码助手</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearHistory}
          disabled={messages.length === 0}
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <Bot className="w-20 h-20 mb-4 text-cyan-400/50" />
            <p className="text-base font-medium">询问关于项目的任何问题</p>
            <p className="text-sm mt-2 text-muted-foreground/80">代码作用、架构分析、功能说明</p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-cyan-500/20 border border-cyan-500/30"
                      : "bg-purple-500/20 border border-purple-500/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {message.role === "assistant" && (
                      <Bot className="w-4 h-4 text-purple-400" />
                    )}
                    <span className={`text-xs font-semibold ${
                      message.role === "user" ? "text-cyan-400" : "text-purple-400"
                    }`}>
                      {message.role === "user" ? "你" : "AI助手"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                <span className="text-sm text-purple-400">AI思考中...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card/50 p-3 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIncludeContext(!includeContext)}
            className={`h-7 px-2 text-xs ${
              includeContext
                ? "text-cyan-400 bg-cyan-500/20 border border-cyan-500/30"
                : "text-muted-foreground"
            }`}
          >
            <Code className="w-3 h-3 mr-1" />
            {includeContext ? "已包含代码上下文" : "包含代码上下文"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="询问代码相关问题 (Shift+Enter换行，Enter发送)..."
            className="min-h-[60px] max-h-[120px] resize-none bg-background/50 border-border focus:border-cyan-500/50 text-sm"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendQuestion}
            disabled={!question.trim() || isLoading}
            size="icon"
            className="bg-cyan-500 hover:bg-cyan-600 text-background shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};