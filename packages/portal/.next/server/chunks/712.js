exports.id=712,exports.ids=[712],exports.modules={2499:(a,b,c)=>{Promise.resolve().then(c.t.bind(c,5208,23)),Promise.resolve().then(c.t.bind(c,331,23)),Promise.resolve().then(c.t.bind(c,9607,23)),Promise.resolve().then(c.t.bind(c,7178,23)),Promise.resolve().then(c.t.bind(c,4174,23)),Promise.resolve().then(c.t.bind(c,9778,23)),Promise.resolve().then(c.t.bind(c,6618,23)),Promise.resolve().then(c.t.bind(c,6671,23)),Promise.resolve().then(c.bind(c,2442))},3775:(a,b,c)=>{"use strict";c.d(b,{E:()=>f});var d=c(6186);let e={active:"#00E5A0",proposed:"#F5A623",deprecated:"#666"};function f({rule:a,domain:b,module:c,trace:f}){return(0,d.jsxs)("div",{style:{border:"1px solid #333",borderRadius:"12px",padding:"20px",marginBottom:"12px",backgroundColor:"#111"},children:[(0,d.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"},children:[(0,d.jsx)("span",{style:{color:"#999",fontSize:"13px",fontFamily:"monospace"},children:a.id||`${b}/${c}`}),(0,d.jsx)("span",{style:{color:e[a.status]||"#999",fontSize:"12px",fontWeight:600,textTransform:"uppercase"},children:a.status})]}),(0,d.jsx)("h3",{style:{margin:"0 0 12px 0",fontSize:"16px"},children:a.summary}),a.given&&(0,d.jsxs)("div",{style:{marginBottom:"8px"},children:[(0,d.jsxs)("span",{style:{color:"#00E5A0",fontWeight:600,fontSize:"13px"},children:["Given:"," "]}),(0,d.jsx)("span",{style:{color:"#ccc",fontSize:"14px"},children:a.given})]}),a.when&&(0,d.jsxs)("div",{style:{marginBottom:"8px"},children:[(0,d.jsxs)("span",{style:{color:"#F5A623",fontWeight:600,fontSize:"13px"},children:["When:"," "]}),(0,d.jsx)("span",{style:{color:"#ccc",fontSize:"14px"},children:a.when})]}),a.then&&(0,d.jsxs)("div",{style:{marginBottom:"8px"},children:[(0,d.jsxs)("span",{style:{color:"#4B9EFF",fontWeight:600,fontSize:"13px"},children:["Then:"," "]}),(0,d.jsx)("span",{style:{color:"#ccc",fontSize:"14px"},children:a.then})]}),a.edge_cases&&a.edge_cases.length>0&&(0,d.jsx)("div",{style:{marginTop:"12px",paddingTop:"8px",borderTop:"1px solid #222"},children:a.edge_cases.map((a,b)=>(0,d.jsxs)("div",{style:{color:"#888",fontSize:"13px",marginBottom:"4px"},children:[(0,d.jsx)("span",{style:{color:"#FF4B4B"},children:"Edge:"})," ",a.case," — ",a.decision]},b))}),f&&(0,d.jsxs)("div",{style:{marginTop:"12px",paddingTop:"8px",borderTop:"1px solid #222",color:"#666",fontSize:"12px"},children:["Requested by ",f.requested_by," via ",f.source," on"," ",new Date(f.requested_at).toLocaleDateString()]})]})}},4907:()=>{},4996:(a,b,c)=>{"use strict";c.d(b,{Z9:()=>h,BH:()=>i,Ux:()=>o});var d=c(9021),e=c(3873),f=c(3392);let g={version:1,specs_dir:"specs",schema:{required_top_level:["domain","module","description","rules"],required_rule_fields:["id","status","summary","description","given","when","then"],forbidden_rule_fields:["rule"],id_format:"REQ-{DOMAIN}-{MODULE}-{NN}"},domains:{},llm:{provider:"anthropic",model:"claude-sonnet-4-6"},git:{branch_prefix:"spec/",commit_prefix:"feat(spec):",create_pr:!0,pr_platform:"github"},dedup:{enabled:!0,similarity_threshold:.7}};function h(a){let b=(0,e.join)(a,".specflow","config.yaml");if(!(0,d.existsSync)(b))return{...g};let c=(0,d.readFileSync)(b,"utf-8");return function a(b,c){let d={...b};for(let e of Object.keys(c))c[e]&&"object"==typeof c[e]&&!Array.isArray(c[e])&&b[e]&&"object"==typeof b[e]&&!Array.isArray(b[e])?d[e]=a(b[e],c[e]):d[e]=c[e];return d}(g,(0,f.qg)(c))}function i(a,b){return(function a(b){let c=[];try{for(let f of(0,d.readdirSync)(b)){if(f.startsWith("_"))continue;let g=(0,e.join)(b,f);(0,d.statSync)(g).isDirectory()?c.push(...a(g)):(f.endsWith(".yaml")||f.endsWith(".yml"))&&c.push(g)}}catch{}return c})((0,e.join)(a,b)).map(b=>{let c=(0,d.readFileSync)(b,"utf-8"),g=(0,f.qg)(c);return g&&g.rules?{...g,filePath:(0,e.relative)(a,b)}:null}).filter(a=>null!==a)}var j=c(6239);async function k(a,b,c){let d=new j.Ay,e=(await d.messages.create({model:c.llm.model,max_tokens:4096,system:function(a,b){let c=b.flatMap(a=>a.rules.map(b=>`${b.id}: ${b.summary} (${a.domain}/${a.module})`)).join("\n");return`You are a requirements analyst. Your job is to convert natural language feature descriptions into structured spec YAML.

Output a JSON object with this exact structure:
{
  "domain": "lowercase domain name",
  "module": "lowercase module name",
  "description": "Plain English description for business stakeholders",
  "rules": [
    {
      "id": null,
      "status": "proposed",
      "summary": "One-line business rule in plain English",
      "description": "Detailed explanation a product manager can read",
      "given": "Preconditions with concrete values ($50 stake, 24 hours before, etc.)",
      "when": "The trigger action",
      "then": "The expected outcome with concrete values",
      "examples": [{"input": {}, "output": {}}],
      "edge_cases": [{"case": "description", "decision": "what happens", "ref": ""}],
      "tests": [],
      "added": "${new Date().toISOString().split("T")[0]}",
      "modified": null
    }
  ]
}

Rules for writing specs:
- Write summary, description, given, when, then in plain English — no code, no function names
- Use real dollar amounts, time ranges, and concrete user actions
- Each rule should be independently testable
- Break complex features into multiple rules (one behavior per rule)
- Monetary values in examples use cents (integer)

${c?`Existing specs in this repo (avoid duplicating these):
${c}`:"No existing specs in this repo yet."}

Respond with ONLY the JSON object. No markdown, no explanation.`}(0,b),messages:[{role:"user",content:a}]})).content[0];if("text"!==e.type)throw Error("Unexpected response type from LLM");return JSON.parse(e.text)}async function l(a,b,c){if(0===b.length||!c.dedup.enabled)return{matches:[]};let d=b.flatMap(a=>a.rules.map(b=>({id:b.id,summary:b.summary,domain:a.domain,module:a.module}))),e=a.rules.map((a,b)=>({index:b,summary:a.summary,description:a.description})),f=new j.Ay,g=(await f.messages.create({model:c.llm.model,max_tokens:2048,system:`You compare draft spec rules against existing spec rules to find duplicates or related rules.

For each draft rule, check if any existing rule is similar. Return a JSON object:
{
  "matches": [
    {
      "existing_rule_id": "REQ-...",
      "draft_rule_index": 0,
      "relationship": "extends|replaces|conflicts|related",
      "confidence": 0.0-1.0,
      "explanation": "Why these are related"
    }
  ]
}

Only include matches with confidence >= ${c.dedup.similarity_threshold}.
Respond with ONLY the JSON object.`,messages:[{role:"user",content:`Existing rules:
${JSON.stringify(d,null,2)}

Draft rules:
${JSON.stringify(e,null,2)}`}]})).content[0];if("text"!==g.type)return{matches:[]};let h=JSON.parse(g.text),i=new Map;for(let a of b)for(let b of a.rules)b.id&&i.set(b.id,{rule:b,spec:a});return{matches:h.matches.filter(a=>i.has(a.existing_rule_id)).map(b=>{let c=i.get(b.existing_rule_id);return{existingSpec:c.spec,existingRule:c.rule,draftRule:a.rules[b.draft_rule_index],relationship:b.relationship,confidence:b.confidence,explanation:b.explanation}})}}var m=c(6108);async function n(a,b,c,f,g){let h=(0,m.Lp)(a),i=`${f.git.branch_prefix}${g}`;await h.checkoutLocalBranch(i);let j=(0,e.join)(a,b);return(0,d.mkdirSync)((0,e.dirname)(j),{recursive:!0}),(0,d.writeFileSync)(j,c,"utf-8"),await h.add(b),await h.commit(`${f.git.commit_prefix} add ${b}`),f.git.create_pr&&await h.push("origin",i,["--set-upstream"]),{branch:i}}async function o(a,b){var c,d;let e=h(a),g=i(a,e.specs_dir),j=await k(b.text,g,e),m=await l(j,g,e),o=function(a,b,c){let d=`${c.specs_dir}/${a.domain}/${a.module}.spec.yaml`,e=b.find(b=>b.domain===a.domain&&b.module===a.module),f=c.domains[a.domain]?.toUpperCase()||a.domain.toUpperCase(),g=a.module.toUpperCase(),h=`REQ-${f}-${g}-`,i=0;for(let a of b)for(let b of a.rules)if(b.id&&b.id.startsWith(h)){let a=parseInt(b.id.slice(h.length),10);a>i&&(i=a)}let j=new Map,k=i+1;for(let b=0;b<a.rules.length;b++)!a.rules[b].id&&(j.set(b,`${h}${String(k).padStart(2,"0")}`),k++);return{filePath:d,domain:a.domain,module:a.module,assignedIds:j,isNewFile:!e}}(j,g,e);for(let[a,b]of o.assignedIds)j.rules[a].id=b,j.rules[a].status="active";let p=function(a,b){let c=new Date().toISOString();return{requested_by:a.submittedBy,requested_at:c,original_text:a.text,interpretation_model:b,interpretation_at:c,reviewed_by:null,reviewed_at:null,source:a.source,related_specs:[],history:[{action:"created",by:a.submittedBy,at:c}]}}(b,e.llm.model);p.related_specs=m.matches.map(a=>({id:a.existingRule.id,relationship:a.relationship,note:a.explanation}));let q={_trace:p,domain:j.domain,module:j.module,description:j.description,rules:j.rules},r=(0,f.As)(q,{lineWidth:100}),s=function(a,b){let c=[];for(let d of b.required_top_level)d in a||c.push(`Missing required top-level key "${d}".`);let d=a.rules;if(!Array.isArray(d))return c.push('"rules" must be an array.'),c;for(let a=0;a<d.length;a++){let e=d[a],f=`rules[${a}]`;if(!e||"object"!=typeof e){c.push(`${f}: must be an object.`);continue}for(let a of b.forbidden_rule_fields)a in e&&c.push(`${f}: forbidden field "${a}". Use "summary" instead.`);for(let a of b.required_rule_fields)a in e||c.push(`${f}: missing required field "${a}".`);for(let a of("added"in e&&null!==e.added&&"object"==typeof e.added&&c.push(`${f}: "added" must be a date string "YYYY-MM-DD", not an object.`),e.status&&!["active","proposed","deprecated"].includes(e.status)&&c.push(`${f}: "status" must be "active", "proposed", or "deprecated".`),["given","when","then"]))a in e&&Array.isArray(e[a])&&c.push(`${f}: "${a}" must be a string, not an array.`)}return c}({...j,filePath:o.filePath},e.schema);if(s.length>0)throw Error(`Generated spec has validation errors:
${s.join("\n")}`);let t=`${j.domain}-${j.module}`.replace(/[^a-z0-9-]/g,"-"),{branch:u}=await n(a,o.filePath,r,e,t),v=(c=`${j.domain}/${j.module}`,d=j.rules.length,`## New Spec: ${c}

**${d} rules** generated from a requirement submission.

### Requirement
> ${p.original_text}

### Traceability
| Field | Value |
|-------|-------|
| Requested by | ${p.requested_by} |
| Submitted via | ${p.source} |
| Interpreted by | ${p.interpretation_model} |
| Submitted at | ${p.requested_at} |

### Related Specs
${0===p.related_specs.length?"None found.":p.related_specs.map(a=>`- ${a.id} (${a.relationship}): ${a.note}`).join("\n")}

---
*Generated by [Specflow](https://github.com/specflow/specflow)*`);return{filePath:o.filePath,branch:u,ruleCount:j.rules.length,deduplication:m,specContent:r,prDescription:v}}},5800:(a,b,c)=>{"use strict";c.r(b),c.d(b,{default:()=>f,metadata:()=>e});var d=c(6186);let e={title:"Specflow — Requirements Portal",description:"Turn natural language requirements into structured, traceable specs"};function f({children:a}){return(0,d.jsx)("html",{lang:"en",children:(0,d.jsxs)("body",{style:{fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',margin:0,padding:0,backgroundColor:"#0a0a0b",color:"#fafaf9"},children:[(0,d.jsxs)("nav",{style:{padding:"16px 24px",borderBottom:"1px solid #333",display:"flex",gap:"24px",alignItems:"center"},children:[(0,d.jsx)("strong",{style:{fontSize:"18px"},children:"Specflow"}),(0,d.jsx)("a",{href:"/",style:{color:"#ccc",textDecoration:"none"},children:"Dashboard"}),(0,d.jsx)("a",{href:"/submit",style:{color:"#ccc",textDecoration:"none"},children:"Submit"}),(0,d.jsx)("a",{href:"/history",style:{color:"#ccc",textDecoration:"none"},children:"History"})]}),(0,d.jsx)("main",{style:{padding:"24px",maxWidth:"1200px",margin:"0 auto"},children:a})]})})}},6274:()=>{},7955:()=>{},9355:(a,b,c)=>{Promise.resolve().then(c.t.bind(c,8706,23)),Promise.resolve().then(c.t.bind(c,8109,23)),Promise.resolve().then(c.t.bind(c,3661,23)),Promise.resolve().then(c.t.bind(c,6884,23)),Promise.resolve().then(c.t.bind(c,7660,23)),Promise.resolve().then(c.t.bind(c,2931,23)),Promise.resolve().then(c.t.bind(c,9816,23)),Promise.resolve().then(c.t.bind(c,6081,23)),Promise.resolve().then(c.t.bind(c,1576,23))}};