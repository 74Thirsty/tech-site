import type { Evaluation } from "./types";
export function approvalGate(evaluation:Evaluation){return {allowed:evaluation.passed,reason:evaluation.passed?"Ready for human approval.":evaluation.issues.join(" ")};}
