"use client";
import { useMemo, useState } from 'react';
import { Download, Sparkles, ArrowRight, Check } from 'lucide-react';
import { creators } from '@/lib/mark/data';
import { blankCampaign, type Campaign } from '@/lib/mark/marketplace/models';
import { matchingService, recommendationLevel } from '@/lib/mark/marketplace/matching';
import { compareCreators } from '@/lib/mark/marketplace/compare';
import { briefReadiness } from '@/lib/mark/marketplace/services';
import { Action, Avatar, Badge, Button, Input, Textarea, Card, PageTitle } from './ui';
import styles from './match-studio.module.css';

const samples = creators.filter(c => c.source === 'sample');
const presets = [
  { name: 'Cinematic product launch', skill: 'AI filmmaking, Video editing', content: 'Product film', tool: 'Runway', format: 'Video', ratio: '16:9', platform: 'YouTube', brief: 'Create a cinematic electric-mobility product film for a fictional launch. Deliver one 30-second video with a storyboard and source-asset handover.' },
  { name: 'Beauty campaign visuals', skill: 'Generative art, Art direction', content: 'Product imagery', tool: 'Midjourney', format: 'Image', ratio: '4:5', platform: 'Instagram', brief: 'Create a fictional skincare launch campaign. Deliver three product visuals with a consistent visual direction and a workflow breakdown.' },
  { name: 'Character-led explainer', skill: 'AI animation, Storyboarding', content: 'Animation', tool: 'Blender', format: 'Video', ratio: '16:9', platform: 'YouTube', brief: 'Produce a fictional 30-second character animation about rooftop gardens. Deliver a storyboard, final video, and a human-contribution breakdown.' },
];
const split = (text: string) => [...new Set(text.split(',').map(s => s.trim()).filter(Boolean))];
const initial = { title: '', brief: '', skills: '', tools: '', contentType: '', format: '', aspectRatio: '', platform: '', style: '', budget: '', commercialUse: 'Unspecified', deadline: '' };

export function MatchStudio() {
  const [form, setForm] = useState(initial);
  const [selected, setSelected] = useState<string[]>([]);
  const [compared, setCompared] = useState(false);
  const [notice, setNotice] = useState('');
  const patch = (key: keyof typeof initial, value: string) => {
    setForm(f => ({ ...f, [key]: value })); setCompared(false); setNotice('');
  };
  const campaign = useMemo<Campaign>(() => ({
    ...blankCampaign('studio'), id: 'studio-brief', title: form.title,
    brief: form.brief, description: form.brief, creativeDirection: form.style,
    contentType: form.contentType, format: form.format, aspectRatio: form.aspectRatio,
    tools: split(form.tools), platforms: split(form.platform),
    commercialUse: form.commercialUse as Campaign['commercialUse'],
    budget: form.budget.trim() && Number.isFinite(Number(form.budget)) && Number(form.budget) >= 0 ? Number(form.budget) : null,
    applicationDeadline: form.deadline,
    requirements: { ...blankCampaign().requirements, requiredSkills: split(form.skills) },
  }), [form]);
  const matches = useMemo(() => matchingService.matchCreatorsToCampaign(campaign, samples), [campaign]);
  const hasRequirements = matches.some(m => m.factors.length > 0);
  const readiness = briefReadiness(campaign);
  const comparison = compared && selected.length >= 2
    ? compareCreators(campaign, samples.filter(c => selected.includes(c.id))) : null;
  const toggle = (id: string) => {
    if (!selected.includes(id) && selected.length >= 4) { setNotice('Compare up to four creators at a time.'); return; }
    setSelected(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
    setCompared(false); setNotice('');
  };
  function download() {
    const payload = { title: 'MarkHECX creator decision brief', generatedAt: new Date().toISOString(),
      disclosure: 'Fictional sample creators. Deterministic matching; not hiring outcomes, verified credentials, or live Gemini research.',
      brief: form, methodology: 'Match = sum(weight × known factor value) / sum(known weights). Coverage = known weights / all requested weights. Missing evidence is not a match.',
      shortlist: matches.filter(m => selected.includes(m.creatorId)).map(m => ({ creator: samples.find(c => c.id === m.creatorId), assessment: m })),
      comparison };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = 'markhecx-decision-brief.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Decision brief downloaded with factor evidence and portfolio metadata.');
  }
  return <div className={`page-enter ${styles.studio}`}>
    <PageTitle eyebrow="HECX / BRIEF TO SHORTLIST" title="Find the craft behind the prompt." description="Turn creative requirements into a shortlist you can explain.">
      <Badge tone="purple">Interactive showcase · No account needed</Badge>
    </PageTitle>
    <div className={styles.steps} aria-label="Demo steps"><span>01 Define your brief</span><ArrowRight size={16}/><span>02 Inspect the evidence</span><ArrowRight size={16}/><span>03 Compare & export</span></div>
    <p className="small-note">Seven fictional sample profiles. Portfolio images and videos are illustrative. All matching runs locally; no model training or external research is claimed.</p>
    <div className={styles.layout}>
      <Card className={`panel ${styles.brief}`}>
        <h2>Your creative brief</h2><p>Start with a sample, then change the requirements to see the ranking respond.</p>
        <div className={styles.presets}>{presets.map(p => <Button key={p.name} variant="outline" onClick={() => {
          setForm({...initial,title:p.name,brief:p.brief,skills:p.skill,tools:p.tool,contentType:p.content,format:p.format,aspectRatio:p.ratio,platform:p.platform});
          setSelected([]);setCompared(false);setNotice('Sample brief loaded. Budget, rights and dates remain yours to specify.');
        }}>{p.name}</Button>)}</div>
        <label className="field">Brief title<Input value={form.title} maxLength={200} onChange={e=>patch('title',e.target.value)} /></label>
        <label className="field">Creative idea & deliverables<Textarea value={form.brief} maxLength={3000} onChange={e=>patch('brief',e.target.value)} placeholder="What should the creator make? Include quantity, length and handover needs." /></label>
        <label className="field">Required skills, separated by commas<Input value={form.skills} maxLength={500} onChange={e=>patch('skills',e.target.value)} placeholder="AI filmmaking, Video editing" list="studio-skills"/></label>
        <datalist id="studio-skills">{[...new Set(samples.flatMap(c=>c.skills))].map(s=><option key={s} value={s}/>)}</datalist>
        <label className="field">Required tools, separated by commas<Input value={form.tools} maxLength={500} onChange={e=>patch('tools',e.target.value)} placeholder="Runway, Blender" /></label>
        <div className={styles.fields}>{(['contentType','format','aspectRatio','platform','style'] as const).map(key=><label className="field" key={key}>
          {{contentType:'Content type',format:'Format',aspectRatio:'Aspect ratio',platform:'Platform',style:'Creative direction'}[key]}
          <Input value={form[key]} maxLength={200} onChange={e=>patch(key,e.target.value)}/></label>)}</div>
        <label className="field">Budget ceiling (USD)<Input type="number" min="0" value={form.budget} onChange={e=>patch('budget',e.target.value)} placeholder="Optional — unknown until supplied"/></label>
        <label className="field">Commercial-use requirement<select className={styles.select} value={form.commercialUse} onChange={e=>patch('commercialUse',e.target.value)}>
          <option value="Unspecified">Not specified</option><option value="Available">Commercial use required</option><option value="Restricted">Restricted / non-commercial use</option>
        </select></label>
        <label className="field">Application deadline<Input type="date" value={form.deadline} onChange={e=>patch('deadline',e.target.value)}/></label>
        <details><summary>Before publishing this brief</summary><p className="small-note">This studio is a working shortlist, not a published campaign. The campaign editor also collects objectives, detailed deliverables and timelines.</p><ul>{readiness.missing.map(label=><li key={label}>{label}</li>)}</ul></details>
        <Button variant="outline" onClick={()=>{setForm(initial);setSelected([]);setCompared(false);setNotice('Brief cleared.');}}>Clear brief</Button>
      </Card>
      <section className={styles.results} aria-label="Creator matches">
        <div className={styles.toolbar}><div><Badge tone="purple"><Sparkles size={14}/> Explainable matching</Badge><h2>{hasRequirements ? 'A shortlist backed by evidence.' : 'Start with what you need.'}</h2></div>
          <Button disabled={selected.length<2 || !hasRequirements} className="ai-action" onClick={()=>setCompared(true)}>Compare {selected.length}/4</Button>
          <Button disabled={!selected.length} onClick={download}><Download size={16}/> Export shortlist</Button>
        </div>
        <p className="small-note">A 95% match means weighted alignment with recorded requirements, not a 95% chance of success. Style and deadlines require human review. Missing data reduces evidence coverage.</p>
        <p role="status" aria-live="polite">{notice}</p>
        {comparison && <Card className={`panel ${styles.comparison}`}><Badge tone="purple">{comparison.provider}</Badge><h2>Your comparison</h2><p>{comparison.summary}</p>
          <div className={styles.tableWrap}><table><caption>Shortlist evidence, side by side</caption><thead><tr><th scope="col">Requirement</th>{comparison.rankedCreatorIds.map(id=><th scope="col" key={id}>{samples.find(c=>c.id===id)?.name}</th>)}</tr></thead><tbody>
            {(matches[0]?.factors || []).map(f=><tr key={f.key}><th scope="row">{f.label} · weight {f.weight}</th>{comparison.rankedCreatorIds.map(id=>{const factor=matches.find(m=>m.creatorId===id)!.factors.find(x=>x.key===f.key);return <td key={id}><strong>{factor?.value==null?'Unknown':`${Math.round(factor.value*100)}%`}</strong><p>{factor?.evidence}</p></td>})}</tr>)}
          </tbody></table></div><h3>Before you choose</h3><ul>{comparison.nextQuestions.map(q=><li key={q}>{q}</li>)}</ul></Card>}
        <div className={styles.cards}>{matches.map(m=>{const c=samples.find(c=>c.id===m.creatorId)!;return <Card key={c.id} className={`panel ${styles.creator}`}>
          <div className={styles.cardHead}><Avatar name={c.name} image={c.avatar}/><div><h3>{c.name}</h3><p>{c.identity}</p></div><label className={styles.shortlist}><input type="checkbox" checked={selected.includes(c.id)} onChange={()=>toggle(c.id)} aria-label={`Shortlist ${c.name}`}/>{selected.includes(c.id)?<Check size={16}/>:'Shortlist'}</label></div>
          {c.banner && <div className={styles.cover} style={{backgroundImage:`url(${c.banner})`}} role="img" aria-label={`${c.name} illustrative portfolio cover`}/>}
          <div className={styles.score}><strong>{m.score===null?'—':`${m.score}%`}</strong><span>requirement match<br/>{m.coverage}% evidence coverage</span></div>
          <Badge tone="purple">{recommendationLevel(m)}</Badge><p className="small-note">Sample profile · self-declared capabilities</p>
          <p>{c.creative?.tools.join(' · ') || 'Tools not supplied'}</p>
          <details><summary>Why this score?</summary>{m.factors.length ? m.factors.map(f=><div className={styles.factor} key={f.key}><strong>{f.label} · {f.value===null?'Unknown':`${Math.round(f.value*100)}%`} · weight {f.weight}</strong><p>{f.evidence}</p></div>):<p>Add a requirement to calculate fit.</p>}</details>
          <details><summary>Workflow & rights</summary><p>{c.creative?.workflow || 'Workflow not supplied.'}</p><p>Human contribution: {c.creative?.humanContribution || 'Not supplied.'}</p><p>Commercial use: {c.creative?.commercialUse || 'Unspecified'}. Confirm licenses and rights directly.</p><p>Style, deadline availability and quality have not been verified.</p></details>
          <div className="row"><Action secondary href={`/u/${c.username}?sample=1`}>View portfolio</Action><Action secondary href={`/profile/${c.username}?sample=1`}>View profile</Action></div>
        </Card>})}</div>
      </section>
    </div>
    <Card className={`panel ${styles.next}`}><div><h2>Ready to turn the brief into work?</h2><p>Use a Brand or Individual workspace to save a campaign, review applications and track delivery.</p></div><Action href="/campaigns/new">Open campaign builder <ArrowRight size={16}/></Action></Card>
  </div>;
}
