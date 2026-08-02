import { promises as fs } from "node:fs";
import path from "node:path";

const statePath = path.join(process.cwd(), "data", "control-state.json");
export async function readLocalState<T>(fallback:T):Promise<T>{try{return JSON.parse(await fs.readFile(statePath,"utf8")) as T;}catch{return fallback;}}
export async function writeLocalState<T>(state:T){await fs.mkdir(path.dirname(statePath),{recursive:true});await fs.writeFile(statePath,JSON.stringify(state,null,2));return state;}
