/**
 * Rule Execution Result DTO
 */
export class RuleExecutionResultDto {
  ruleKey: string;
  ruleName: string;
  conditionMatched: boolean;
  actionsExecuted: boolean;
  status: string;
  outputData?: Record<string, any>;
  errorMessage?: string;
  executionTimeMs: number;
}

