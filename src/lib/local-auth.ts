import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

type LocalUser={username:string;email:string;passwordHash:string};
const usersPath=path.join(process.cwd(),"data","users.json");
async function readUsers():Promise<LocalUser[]>{try{return JSON.parse(await fs.readFile(usersPath,"utf8")) as LocalUser[];}catch{return [];}}
export async function localAuth(action:"login"|"signup",username:string,email:string,password:string){const users=await readUsers();const passwordHash=crypto.createHash("sha256").update(password).digest("hex");if(action==="signup"){if(users.some((user)=>user.email===email))return {ok:false,status:409,message:"An account already exists for this email."};users.push({username,email,passwordHash});await fs.mkdir(path.dirname(usersPath),{recursive:true});await fs.writeFile(usersPath,JSON.stringify(users,null,2));return {ok:true,status:200,message:"Profile created."};}const user=users.find((entry)=>entry.email===email&&entry.passwordHash===passwordHash);return user?{ok:true,status:200,message:"Access granted.",username:user.username}:{ok:false,status:401,message:"Email or password is incorrect."};}
