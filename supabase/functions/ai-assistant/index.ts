import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ai-assistant] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    logStep("Received request", { method: req.method });

    const { question, context } = await req.json();
    
    if (!question) {
      throw new Error("Question is required");
    }

    logStep("Processing question", { question: question.substring(0, 50) });

    // Get DeepSeek API key from environment
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!deepseekApiKey) {
      throw new Error("DEEPSEEK_API_KEY not configured");
    }

    // Build system prompt with project context
    const systemPrompt = `你是Y86-64 CPU模拟器项目的AI助手。你的任务是帮助用户理解项目代码、架构和功能。

项目概述：
- 这是一个基于Web的Y86-64 CPU模拟器，使用React + TypeScript构建
- 核心功能包括：指令执行、寄存器管理、内存操作、断点调试、执行历史回溯
- 架构采用赛博朋克风格的UI设计，使用Tailwind CSS和shadcn/ui组件库
- CPU模拟器核心逻辑位于 src/lib/y86/ 目录
- UI组件位于 src/components/desktop/ 目录
- 主页面是 src/pages/desktop/SimulatorPage.tsx

关键模块：
1. src/lib/y86/cpu.ts - CPU执行引擎，实现指令解码和执行
2. src/lib/y86/types.ts - 类型定义（寄存器、状态码、指令枚举等）
3. src/components/desktop/CodeEditor.tsx - 代码编辑器，支持断点设置
4. src/components/desktop/RegisterPanel.tsx - 寄存器显示面板
5. src/components/desktop/BreakpointPanel.tsx - 断点管理面板
6. src/components/desktop/HistoryPanel.tsx - 执行历史面板

请根据用户的问题，提供清晰、准确的技术解答。`;

    // Call DeepSeek API
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          ...(context ? [{ role: "system", content: `当前代码上下文：\n${context}` }] : []),
          { role: "user", content: question }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("DeepSeek API error", { status: response.status, error: errorText });
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    logStep("DeepSeek response received", { hasContent: !!data.choices?.[0]?.message?.content });

    const answer = data.choices?.[0]?.message?.content || "抱歉，我无法回答这个问题。";

    return new Response(
      JSON.stringify({ answer }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in ai-assistant", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
