import { articles, books, projects } from "@/lib/content";
import { generateIssue } from "@/newsletter/issue-generator";
import { supabaseRequest } from "@/lib/supabase";
import { readLocalState, writeLocalState } from "@/lib/local-store";

type QueueItem = {id:string;kind:string;title:string;status:"NEEDS_REVIEW"|"APPROVED"};
type ControlState = {issue:ReturnType<typeof generateIssue>|null;queue:QueueItem[];timeline:string[];lastResearch:string|null;counts:{articles:number;projects:number;books:number}};

const globalState = globalThis as typeof globalThis & { neonForgeControl?:ControlState };
if (!globalState.neonForgeControl) globalState.neonForgeControl = {issue:null,queue:[],timeline:[],lastResearch:null,counts:{articles:articles.length,projects:projects.length,books:books.length}};

export function getControlState(){return globalState.neonForgeControl!;}
export async function loadControlState(){const local=await readLocalState<Partial<ControlState>>({});const state=getControlState();Object.assign(state,local);return state;}
export async function updateControl(action:string,id?:string){const state=getControlState();if(action==="generate") {state.issue=generateIssue();state.queue.unshift({id:`newsletter-${Date.now()}`,kind:"NEWSLETTER",title:state.issue.subject,status:"NEEDS_REVIEW"});state.timeline.unshift("Newsletter draft generated from current content");await supabaseRequest("newsletter_issues",{method:"POST",body:JSON.stringify({subject:state.issue.subject,status:"NEEDS_REVIEW",content:state.issue})});}if(action==="approve"&&id){const item=state.queue.find((entry)=>entry.id===id);if(item){item.status="APPROVED";state.timeline.unshift(`${item.kind} approved by human editor`);}}if(action==="research"){state.lastResearch=new Date().toISOString();state.timeline.unshift("Research run completed; review queue refreshed");}if(action==="generate-articles"){state.timeline.unshift("Article generation initiated");}await writeLocalState({issue:state.issue,queue:state.queue,timeline:state.timeline,lastResearch:state.lastResearch});return state;}
