/**
 * 摘要生成的提示词
 */

export const SUMMARIZER_PROMPT = `请对上面的对话内容进行详细但简洁的摘要。重点关注对继续对话有帮助的信息，包括：

- 我们做了什么（已完成的任务、做出的决策）
- 我们当前正在做什么（进行中的任务、待完成的工作）
- 我们正在操作哪些文件（文件路径、所做的修改）
- 我们接下来要做什么（计划中的行动、下一步步骤）

摘要要全面但避免不必要的细节。目标是提供足够的上下文以便高效地继续对话。

请按以下格式回复：

## 目标
[对整体目标的简要描述]

## 指令
[需要遵循的关键指令或约束]

## 发现
[重要的发现或收获]

## 已完成
[已完成的工作]

## 相关文件 / 目录
[重要文件和目录的列表，并附简要说明]

## 下一步
[接下来需要做的事情]`;

/**
 * 构建摘要请求消息
 */
export function buildSummarizerMessages(messages: Array<{ role: string; content: string }>): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  return [
    ...messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    {
      role: 'user' as const,
      content: SUMMARIZER_PROMPT,
    },
  ];
}
