"use client";
import { useEffect, useState } from "react";

type QueueItem={id:string;kind:string;title:string;status:"NEEDS_REVIEW"|"APPROVED"};
type State={issue:{id:string;subject:string;topics:string[]}|null;queue:QueueItem[];timeline:string[];lastResearch:string|null;counts:{articles:number;projects:number;books:number}};

export default function ControlCenter(){
  const [state,setState]=useState<State|null>(null);
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [generatingArticles,setGeneratingArticles]=useState(false);
  
  const refresh=async()=>{try{const response=await fetch("/api/control");const data=await response.json();if(!response.ok){setError(JSON.stringify(data));setState(null);return;}setError("");setState(data);}catch(e:any){setError(e.message);setState(null);}};
  useEffect(()=>{refresh()},[]);
  
  const action=async(actionName:string,id?:string)=>{
    setBusy(actionName);
    const response=await fetch("/api/control",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:actionName,id})});
    if(response.ok){setState(await response.json());}
    setBusy("");
  };

  const generateArticles=async()=>{
    setGeneratingArticles(true);
    try{
      const response=await fetch("/api/articles/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"generate-all"})});
      const result=await response.json();
      if(result.success){
        await refresh();
      }
    }finally{
      setGeneratingArticles(false);
    }
  };

  if(!state)return <main className="control-page"><div className="auth-page">{error ? <pre style={{color:"red",whiteSpace:"pre-wrap"}}>{error}</pre> : "Loading command center..."}</div></main>;
  
  return <main className="control-page">
    <header className="site-header">
      <a className="brand" href="/"><span className="brand-mark">N</span><span>STRATAGEM</span></a>
      <span className="card-kicker">CONTROL CENTER / LIVE</span>
      <a className="text-link" href="/">Return to arcade ↗</a>
    </header>
    <div className="control-grid">
      <aside className="section-label"><span>ROOT</span><span>COMMAND<br/>CENTER</span></aside>
      <section>
        <div className="control-heading">
          <div>
            <div className="card-kicker">OPERATIONS / RUNTIME STATE</div>
            <h1>RUN THE<br/><em>FORGE.</em></h1>
          </div>
          <span className="status-dot">● LOCAL CONTROL ACTIVE</span>
        </div>
        <div className="metric-grid">
          <Metric label="ARTICLES" value={String(state.counts.articles)} detail="LOCAL CONTENT"/>
          <Metric label="PROJECTS" value={String(state.counts.projects)} detail="LOCAL CONTENT"/>
          <Metric label="BOOKS" value={String(state.counts.books)} detail="LOCAL CONTENT"/>
          <Metric label="LAST RESEARCH" value={state.lastResearch ? "COMPLETE" : "NOT RUN"} detail={state.lastResearch ?? "RUN IT BELOW"}/>
        </div>
        <div className="control-actions">
          <button className="button button-primary" disabled={Boolean(busy)} onClick={()=>action("research")}>{busy==="research"?"Research running...":"Run research →"}</button>
          <button className="button button-outline" disabled={Boolean(busy)||generatingArticles} onClick={generateArticles}>{generatingArticles?"Generating articles...":"Generate articles →"}</button>
          <button className="button button-outline" disabled={Boolean(busy)} onClick={()=>action("generate")}>{busy==="generate"?"Generating newsletter...":"Generate newsletter →"}</button>
        </div>
        {state.issue&&<article className="control-panels">
          <div>
            <div className="card-kicker">LATEST DRAFT</div>
            <h2>{state.issue.subject}</h2>
            <p>{state.issue.topics.join(" / ")}</p>
            <button className="button button-primary" disabled={Boolean(busy)} onClick={()=>action("approve",`newsletter-${state.issue?.id}`)}>Approve →</button>
          </div>
        </article>}
        <div className="control-panels">
          <article>
            <div className="card-kicker">TIMELINE</div>
            {state.timeline.slice(0,8).map((entry,i)=><div className="pipeline-row" key={i}><span>{String(i+1).padStart(2,"0")}</span><b>{entry}</b></div>)}
          </article>
          <article>
            <div className="card-kicker">REVIEW QUEUE</div>
            {state.queue.length===0&&<p style={{color:"var(--muted)",font:"11px 'DM Mono'",marginTop:20}}>No items in queue</p>}
            {state.queue.map((item)=><div className="queue-item" key={item.id}><span>{item.kind}</span><b>{item.title}</b>{item.status==="NEEDS_REVIEW"&&<button className="queue-approve" disabled={Boolean(busy)} onClick={()=>action("approve",item.id)}>APPROVE ↗</button>}</div>)}
          </article>
        </div>
      </section>
    </div>
  </main>;
}

function Metric({label,value,detail}:{label:string;value:string;detail:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>}
