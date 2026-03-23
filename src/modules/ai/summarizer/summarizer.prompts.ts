/**
 * 摘要生成的提示词
 */

export const SUMMARIZER_PROMPT = `Provide a detailed but concise summary of our conversation above. Focus on information that would be helpful for continuing the conversation, including:

- What we did (completed tasks, decisions made)
- What we're currently working on (active tasks, pending work)
- Which files we're working on (file paths, modifications made)
- What we're going to do next (planned actions, next steps)

Keep the summary comprehensive but avoid unnecessary details. The goal is to provide enough context for continuing the conversation efficiently.

Format your response as:

## Goal
[Brief description of the overall goal]

## Instructions
[Key instructions or constraints to follow]

## Discoveries
[Important findings or discoveries made]

## Accomplished
[What has been completed]

## Relevant files / directories
[List of important files and directories with brief descriptions]

## Next steps
[What needs to be done next]`;

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
