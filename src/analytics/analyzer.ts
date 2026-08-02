export type PerformanceRow={topic:string;views:number;completionRate:number;conversions:number};
export function analyzePerformance(rows:PerformanceRow[]){return rows.map((row)=>({...row,score:Math.round(row.views*.4+row.completionRate*.4+row.conversions*2)})).sort((a,b)=>b.score-a.score);}
