export type JobStatus="IDLE"|"RUNNING"|"COMPLETE"|"FAILED";
export type JobResult={job:string;status:JobStatus;startedAt:string;finishedAt?:string;errors:string[];outputCount:number};
