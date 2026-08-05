import projectData from "@/content/projects.json";
import bookData from "@/content/books.json";
import eventData from "@/content/events.json";
import githubData from "@/content/github.json";
import npmData from "@/content/npm-packages.json";
import pypiData from "@/content/pypi-packages.json";
import dockerData from "@/content/docker-images.json";

export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type Article = { slug:string; title:string; category:string; difficulty:Difficulty; readTime:string; xp:number; excerpt:string; tags:string[]; body?:string };
export type Book = { slug:string; title:string; author:string; description:string; appleBooksUrl:string; coverImage:string };
export type GitHubRepo = { name:string; description:string; url:string; language:string; status:string };
export type NpmPackage = { name:string; version:string; description:string; url:string; weeklyDownloads:number; keywords:string[] };
export type PypiPackage = { name:string; version:string; description:string; url:string; repoUrl:string };
export type DockerImage = { name:string; description:string; url:string; pulls:number; category:string };
export const projects = projectData;
export const books = bookData as Book[];
export const events = eventData;
export const githubRepos = githubData as GitHubRepo[];
export const npmPackages = npmData as NpmPackage[];
export const pypiPackages = pypiData as PypiPackage[];
export const dockerImages = dockerData as DockerImage[];
export const skills = [{name:"PYTHON",level:8},{name:"BLOCKCHAIN",level:7},{name:"LINUX",level:8},{name:"SECURITY",level:7},{name:"SOLIDITY",level:5},{name:"AI/AUTOMATION",level:5},{name:"SYSTEMS DESIGN",level:7},{name:"DATA PIPELINES",level:6}];

export const missionTracks = {
  BLOCKCHAIN: {title:"Build DeFi Infrastructure",steps:["Understand AMM mechanics","Map a token graph","Find an arbitrage cycle","Execute atomically"],reward:"CHAIN ENGINEER",xp:650},
  SECURITY: {title:"Run a Recon Pipeline",steps:["Scan a target network","Enumerate services","Gather OSINT","Generate an intelligence report"],reward:"THREAT ANALYST",xp:600},
  LINUX: {title:"Master Linux Systems",steps:["Harden SSH access","Monitor system metrics","Package an AppImage","Deploy a server"],reward:"SYSTEMS OPERATOR",xp:500},
  AI: {title:"Build an AI Agent",steps:["Define the action layer","Integrate tool APIs","Handle error recovery","Ship a working assistant"],reward:"AGENT BUILDER",xp:550}
} as const;
