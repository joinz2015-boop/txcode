import { Message } from '../../memory/memory.types.js';

export interface ProviderStep {
  thought: string;
  actions: { actionName: string; actionInput: any }[];
  results?: { name: string; success: boolean; output?: any; error?: string }[];
  observation?: any;
}

export class ProviderParser {
  parse(messages: Message[]): ProviderStep[] {
    const steps: ProviderStep[] = [];
    let currentStep: ProviderStep | null = null;

    for (const msg of messages) {
      if (msg.role === 'user' && (msg as any).isOriginal) {
        if (currentStep && (currentStep.thought || currentStep.actions.length > 0)) {
          steps.push(currentStep);
          currentStep = null;
        }
        continue;
      }

      if (msg.role === 'assistant') {
        try {
          const parsed = JSON.parse(msg.content);
          
          if (parsed.type === 'assistant_with_tools' && parsed.toolCalls) {
            if (currentStep && (currentStep.thought || currentStep.actions.length > 0)) {
              steps.push(currentStep);
            }
            currentStep = {
              thought: '',
              actions: parsed.toolCalls.map((tc: any) => ({
                actionName: tc.function.name,
                actionInput: typeof tc.function.arguments === 'string' 
                  ? JSON.parse(tc.function.arguments) 
                  : tc.function.arguments,
              })),
            };
          } else if (parsed.type !== 'assistant_with_tools') {
            if (currentStep && currentStep.actions.length > 0) {
              currentStep.thought = msg.content;
            } else if (currentStep) {
              currentStep.thought = msg.content;
            } else {
              steps.push({
                thought: msg.content,
                actions: [],
              });
            }
          }
        } catch {
          if (currentStep && currentStep.actions.length > 0) {
            currentStep.thought = msg.content;
          } else if (currentStep) {
            currentStep.thought = msg.content;
          } else {
            steps.push({
              thought: msg.content,
              actions: [],
            });
          }
        }
      } else if (msg.role === 'tool') {
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed.type === 'tool_result' && currentStep) {
            if (!currentStep.results) {
              currentStep.results = [];
            }
            currentStep.results.push({
              name: '',
              success: true,
              output: parsed.output,
            });
          }
        } catch {
          if (currentStep) {
            currentStep.observation = msg.content;
          }
        }
      }
    }

    if (currentStep && (currentStep.thought || currentStep.actions.length > 0)) {
      steps.push(currentStep);
    }

    return steps;
  }
}

export const providerParser = new ProviderParser();
