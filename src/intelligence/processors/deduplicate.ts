import type { IntelligenceItem } from "@/intelligence/types";
export function deduplicate(items:IntelligenceItem[]){const seen=new Set<string>();return items.filter((item)=>{const key=item.title.toLowerCase().replace(/[^a-z0-9]/g,"");if(seen.has(key))return false;seen.add(key);return true;});}
