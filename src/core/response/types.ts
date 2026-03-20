interface ExecutionDetail {
  action: string;
  success: boolean;
  result?: any;
  args?: any;
}

export interface ExecutionSummary {
  status: "SUCCESS" | "INTERRUPTED";
  total_steps: number;
  completed_steps: number;
  details: ExecutionDetail[];
}
