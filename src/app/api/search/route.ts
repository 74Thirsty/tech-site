import { NextResponse } from "next/server";
import { books, projects } from "@/lib/content";
import { getAllPublishedArticles } from "@/lib/generated-articles";

export async function GET(request:Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const articles = await getAllPublishedArticles();
  const results = [...articles.map((item) => ({kind:"MISSION",title:item.title,slug:item.slug,xp:item.xp,search:`${item.title} ${item.category} ${(item.tags ?? []).join(" ")}`})),...projects.map((item) => ({kind:"PROJECT",title:item.name,slug:item.name.toLowerCase().replaceAll(" ","-"),xp:0,search:`${item.name} ${item.type} ${item.stack.join(" ")}`})),...books.map((item) => ({kind:"BOOK",title:item.title,slug:item.slug,xp:0,search:`${item.title} ${item.description}`}))].filter((item) => item.search.toLowerCase().includes(query)).map(({search,...item}) => item);
  return NextResponse.json({query,results});
}
