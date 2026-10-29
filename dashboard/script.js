const API_BASE = "http://127.0.0.1:8000";
const SLA_LIMIT = 0.100;
let historyChart, distributionChart, distributionBars, cpuChart, ramChart, slaComparisonChart;

const $ = id => document.getElementById(id);
const ms = seconds => (seconds * 1000).toFixed(2) + " ms";

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a,b)=>a-b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index), upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function exponentialDelayProbability(lambda, threshold) {
  return Math.exp(-lambda * threshold);
}

function updateClock() {
  $("clock").textContent = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

function baseChartOptions(yTitle, xTitle="Observation") {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{labels:{color:"#9fb7da",font:{size:10}}}},
    scales:{
      x:{title:{display:true,text:xTitle,color:"#7894b9",font:{size:10}},ticks:{color:"#6f89ad",font:{size:9},autoSkip:true,maxRotation:45,minRotation:0},grid:{color:"#173252"}},
      y:{title:{display:true,text:yTitle,color:"#7894b9",font:{size:10}},ticks:{color:"#6f89ad",font:{size:9}},grid:{color:"#173252"}}
    }
  };
}

function renderCharts(data) {
  if (!data.length) return;
  const labels = data.map((_,i)=>i+1);
  const valuesMs = data.map(v=>v*1000);

  if(historyChart) historyChart.destroy();
  historyChart = new Chart($("historyChart"), {
    type:"line",
    data:{labels,datasets:[{label:"Response Time",data:valuesMs,borderColor:"#2c80ff",backgroundColor:"rgba(44,128,255,.12)",fill:true,tension:.28,pointRadius:2,pointBackgroundColor:"#56a0ff"}]},
    options:baseChartOptions("Response time (ms)","Request sequence")
  });

  const max = Math.max(...data, SLA_LIMIT);
  const bins = 12;
  const step = max / bins || 0.001;
  const counts = Array(bins).fill(0);
  data.forEach(v => counts[Math.min(bins-1,Math.floor(v/step))]++);
  const labelsBins = counts.map((_,i)=>((i*step)*1000).toFixed(0)+"ms");

  if(distributionBars) distributionBars.destroy();
  distributionBars = new Chart($("distributionBars"), {
    type:"bar",
    data:{labels:labelsBins,datasets:[{label:"Requests",data:counts,backgroundColor:"#287cff",borderRadius:3}]},
    options:baseChartOptions("Request count","Response-time range (ms)")
  });

  const lambda = 1 / (data.reduce((a,b)=>a+b,0)/data.length);
  const points = Array.from({length:40},(_,i)=>i*max/39);
  const fit = points.map(x => lambda*Math.exp(-lambda*x));

  if(distributionChart) distributionChart.destroy();
  distributionChart = new Chart($("distributionChart"), {
    type:"line",
    data:{labels:points.map(x=>(x*1000).toFixed(0)),datasets:[{label:"Exponential fit",data:fit,borderColor:"#c05cff",borderWidth:2,pointRadius:0,tension:.25}]},
    options:baseChartOptions("Probability density (1/second)","Response time (ms)")
  });
}

function renderServerCharts(records) {
  if (!records.length) return;
  const labels = records.map((r,i)=>i+1);
  const response = records.map(r=>Number(r.response_time_ms || r.response_time*1000));
  const cpu = records.map(r=>Number(r.cpu_percent || 0));
  const ram = records.map(r=>Number(r.ram_percent || 0));

  const scatterOptions = {
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{labels:{color:"#9fb7da",font:{size:10}}}},
    scales:{
      x:{title:{display:true,text:"Resource utilisation (%)",color:"#7894b9",font:{size:10}},ticks:{color:"#6f89ad",font:{size:9}},grid:{color:"#173252"}},
      y:{title:{display:true,text:"Response time (ms)",color:"#7894b9",font:{size:9}},ticks:{color:"#6f89ad",font:{size:9}},grid:{color:"#173252"}}
    }
  };

  if(cpuChart) cpuChart.destroy();
  cpuChart = new Chart($("cpuChart"), {
    type:"scatter",
    data:{datasets:[{label:"Response vs CPU",data:records.map(r=>({x:Number(r.cpu_percent||0),y:Number(r.response_time_ms||r.response_time*1000)})),backgroundColor:"#28d8c3",pointRadius:4}]},
    options:scatterOptions
  });

  if(ramChart) ramChart.destroy();
  ramChart = new Chart($("ramChart"), {
    type:"scatter",
    data:{datasets:[{label:"Response vs RAM",data:records.map(r=>({x:Number(r.ram_percent||0),y:Number(r.response_time_ms||r.response_time*1000)})),backgroundColor:"#b35cff",pointRadius:4}]},
    options:scatterOptions
  });
}

async function loadDashboard() {
  try {
    const [metricsRes, timesRes, serverRes, slaRes] = await Promise.all([
      fetch(API_BASE + "/api/metrics"),
      fetch(API_BASE + "/api/response-times"),
      fetch(API_BASE + "/api/server-metrics"),
      fetch(API_BASE + "/api/sla")
    ]);
    if (!metricsRes.ok || !timesRes.ok || !serverRes.ok || !slaRes.ok) throw new Error("API unavailable");

    const metrics = await metricsRes.json();
    const times = (await timesRes.json()).response_times || [];
    const records = (await serverRes.json()).metrics || [];
    const sla = await slaRes.json();

    const delayProbability = exponentialDelayProbability(metrics.lambda, SLA_LIMIT);
    const empiricalSla = times.length ? times.filter(v => v <= SLA_LIMIT).length / times.length : 0;
    const p95 = percentile(times, .95);
    const p99 = percentile(times, .99);

    $("requests").textContent = metrics.requests;
    $("mean").textContent = ms(metrics.mean);
    $("meanSeconds").textContent = metrics.mean.toFixed(6) + " seconds";
    $("lambda").textContent = metrics.lambda.toFixed(2) + " /s";
    $("variance").textContent = metrics.variance.toFixed(6);
    $("p95").textContent = ms(p95);
    $("p99").textContent = ms(p99);
    $("delayProbability").textContent = (delayProbability*100).toFixed(1) + "%";
    $("slaCompliance").textContent = (empiricalSla*100).toFixed(1) + "%";
    $("delayNote").textContent = "Model P(X > 100ms)";
    $("slaNote").textContent = "Observed ≤ 100 ms";

    $("statRequests").textContent = metrics.requests;
    $("statMean").textContent = ms(metrics.mean);
    $("statVariance").textContent = metrics.variance.toFixed(9);
    $("statLambda").textContent = metrics.lambda.toFixed(2) + " /s";
    $("statP95").textContent = ms(p95);
    $("statP99").textContent = ms(p99);
    $("statDelay").textContent = (delayProbability*100).toFixed(1) + "%";
    $("statSla").textContent = (empiricalSla*100).toFixed(1) + "%";

    const latest = records[records.length - 1];
    if (latest) {
      $("cpuUsage").textContent = Number(latest.cpu_percent).toFixed(1) + "%";
      $("ramUsage").textContent = Number(latest.ram_percent).toFixed(1) + "%";
      $("httpStatus").textContent = latest.status_code;
      $("latestResponse").textContent = Number(latest.response_time_ms).toFixed(2) + " ms";
      $("latestTimestamp").textContent = new Date(latest.timestamp).toLocaleString();
    }

    // SLA Analysis
    $("slaThreshold").textContent = Number(sla.threshold_ms).toFixed(0) + " ms";
    $("slaTarget").textContent = Number(sla.target_percent).toFixed(1) + "%";
    $("slaActualCompliance").textContent = Number(sla.actual_compliance_percent).toFixed(1) + "%";
    $("slaViolations").textContent = Number(sla.violating_requests).toLocaleString();
    $("slaModelCompliance").textContent = Number(sla.model_compliance_percent).toFixed(1) + "%";
    $("slaModelViolation").textContent = Number(sla.model_violation_percent).toFixed(1) + "%";
    $("slaTotalRequests").textContent = Number(sla.total_requests).toLocaleString();
    $("slaCompliantRequests").textContent = Number(sla.compliant_requests).toLocaleString();
    $("slaViolatingRequests").textContent = Number(sla.violating_requests).toLocaleString();
    $("slaLambda").textContent = Number(sla.lambda).toFixed(4) + " /s";
    const slaBadge = $("slaStatusBadge");
    slaBadge.textContent = sla.sla_status;
    slaBadge.className = "sla-status " + (sla.sla_status === "PASS" ? "pass" : (sla.sla_status === "NO DATA" ? "nodata" : "violation"));

    
    if (slaComparisonChart) slaComparisonChart.destroy();
    slaComparisonChart = new Chart($("slaComparisonChart"), {
      type:"bar",
      data:{
        labels:["Compliance","Violation"],
        datasets:[
          {
            label:"Actual",
            data:[Number(sla.actual_compliance_percent),Number(sla.actual_violation_percent)],
            backgroundColor:"#28d8c3",
            borderRadius:5
          },
          {
            label:"Exponential Model",
            data:[Number(sla.model_compliance_percent),Number(sla.model_violation_percent)],
            backgroundColor:"#b35cff",
            borderRadius:5
          }
        ]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        scales:{
          x:{title:{display:true,text:"SLA outcome",color:"#7894b9",font:{size:10}},ticks:{color:"#9fb7da",font:{size:9}},grid:{color:"#173252"}},
          y:{min:0,max:100,ticks:{color:"#6f89ad",font:{size:9},callback:value=>value+"%"},grid:{color:"#173252"},title:{display:true,text:"Percentage",color:"#7894b9",font:{size:9}}}
        },
        plugins:{
          legend:{labels:{color:"#9fb7da",font:{size:10}}},
          tooltip:{callbacks:{label:context=>context.dataset.label+": "+Number(context.raw).toFixed(2)+"%"}}
        }
      }
    });

    const resultCard = $("slaResultCard");
    const resultText = $("slaResultText");
    const resultMessage = $("slaResultMessage");
    const resultIcon = $("slaResultIcon");
    if (sla.sla_status === "PASS") {
      resultCard.className = "sla-result-card pass";
      resultIcon.textContent = "✓";
      resultText.textContent = "PASS";
      resultMessage.textContent = "Observed compliance meets or exceeds the configured SLA target.";
    } else if (sla.sla_status === "VIOLATION") {
      resultCard.className = "sla-result-card violation";
      resultIcon.textContent = "!";
      resultText.textContent = "VIOLATION";
      resultMessage.textContent = "Observed compliance is below the configured SLA target.";
    } else {
      resultCard.className = "sla-result-card nodata";
      resultIcon.textContent = "—";
      resultText.textContent = "NO DATA";
      resultMessage.textContent = "No response-time data is available for SLA evaluation.";
    }

    $("serverStatus").textContent = "Server Online";
    $("serverStatus").style.color = "#55e0bd";

    renderCharts(times);
    renderServerCharts(records);

    const recent = records.slice(-10).reverse();
    $("liveFeed").innerHTML = recent.map((r,i)=>{
      const value = Number(r.response_time_ms || r.response_time*1000);
      const delayed = value > SLA_LIMIT*1000;
      return '<div class="feed-row"><span>'+(records.length-i)+'</span><span>'+value.toFixed(2)+' ms</span><span class="'+(delayed?'delay':'ok')+'">'+(delayed?'⚠ Delay':'✓ OK')+'</span></div>';
    }).join("");
  } catch (err) {
    $("serverStatus").textContent = "Backend Offline";
    $("serverStatus").style.color = "#ff8d8d";
    console.error(err);
  }
}

$("refreshBtn").addEventListener("click", loadDashboard);
loadDashboard();
setInterval(loadDashboard, 10000);

// Sidebar navigation
$("slaNav").addEventListener("click", () => {
  $("slaAnalysis").scrollIntoView({ behavior: "smooth", block: "start" });
});


// Dataset Analysis mode. All uploaded-file processing stays in this browser and never
// mutates the live API data or live-monitoring charts.
let datasetRows = [], datasetHeaders = [], datasetHistoryChart, datasetHistogramChart, datasetModelChart, datasetCpuChart, datasetRamChart, datasetSlaChart, datasetDistributionBars;
const datasetState = {active:false};
function parseCSV(text) {
  const rows=[]; let row=[], field="", quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){
      if(c==='"' && text[i+1]==='"'){field+='"';i++;}
      else if(c==='"') quoted=false;
      else field+=c;
    } else if(c==='"') quoted=true;
    else if(c===","){row.push(field);field="";}
    else if(c==="\n"){row.push(field.replace(/\\r$/,""));rows.push(row);row=[];field="";}
    else field+=c;
  }
  if(field.length || row.length){row.push(field.replace(/\\r$/,""));rows.push(row);}
  return rows.filter(r=>r.some(v=>String(v).trim()!==""));
}
function fmtNumber(n){return Number(n).toLocaleString(undefined,{maximumFractionDigits:6});}
function destroyDatasetCharts(){[datasetHistoryChart,datasetHistogramChart,datasetModelChart,datasetCpuChart,datasetRamChart,datasetSlaChart,datasetDistributionBars].forEach(c=>{if(c)c.destroy();});datasetHistoryChart=datasetHistogramChart=datasetModelChart=datasetCpuChart=datasetRamChart=datasetSlaChart=datasetDistributionBars=null;}
function showMode(mode){
  datasetState.active=mode==="dataset";
  $("liveDashboard").hidden=datasetState.active;
  $("datasetSection").hidden=!datasetState.active;
  document.querySelectorAll(".nav-item[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===mode));
  if(!datasetState.active) loadDashboard();
}
document.querySelectorAll(".nav-item[data-view]").forEach(b=>b.addEventListener("click",()=>showMode(b.dataset.view)));
// Statistics opens the dataset statistics workspace; the Dataset Analysis button remains available separately.
let bundledDatasetLoaded=false;
$("statisticsNav").addEventListener("click",async()=>{
  showMode("dataset");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));
  $("statisticsNav").classList.add("active");
  if(!bundledDatasetLoaded){await loadBundledDataset();bundledDatasetLoaded=!$("datasetResults").hidden;}
  const target=$("datasetResults").hidden?document.querySelector(".dataset-upload-panel"):$("datasetResults");
  target.scrollIntoView({behavior:"smooth",block:"start"});
});
$("datasetFile").addEventListener("change",async event=>{
  const file=event.target.files && event.target.files[0]; if(!file)return;
  try{
    const text=await file.text(), parsed=parseCSV(text);
    if(parsed.length<2) throw new Error("The CSV must contain a header row and at least one data row.");
    datasetHeaders=parsed[0].map((h,i)=>String(h).trim()||("Column "+(i+1)));
    datasetRows=parsed.slice(1).map(r=>Object.fromEntries(datasetHeaders.map((h,i)=>[h,(r[i]??"").trim()])));
    const select=$("latencyColumn");select.innerHTML="";
    datasetHeaders.forEach(h=>{
      const opt=document.createElement("option");opt.value=h;opt.textContent=h;select.appendChild(opt);
    });
    const likely=datasetHeaders.find(h=>/response.?time|latency|duration|elapsed|p95|p99|p50|time.?ms|time.?s/i.test(h));
    if(likely)select.value=likely;
    const selected=select.value;
    const sample=datasetRows.map(r=>Number(String(r[selected]??"").replace(/,/g,""))).filter(Number.isFinite);
    $("latencyUnit").value=/(_s|seconds?|time.?s)$/i.test(selected)?"s":"ms";
    $("datasetControls").hidden=false;$("datasetResults").hidden=true;
    $("datasetMessage").textContent="Loaded "+file.name+" · "+datasetRows.length.toLocaleString()+" data rows · "+datasetHeaders.length+" columns. Select the correct numeric column and unit, then analyze.";
    $("datasetCaveat").hidden=true;
    if(!sample.length) $("datasetMessage").textContent+=" The selected column has no numeric values; choose another column.";
  }catch(err){$("datasetMessage").textContent="Could not read this CSV: "+err.message;}
});
$("analyzeDatasetBtn").addEventListener("click",analyzeDataset);
$("latencyColumn").addEventListener("change",()=>{$("datasetResults").hidden=true;});

// Extra Statistics visualizations: generated from the full dataset, not hard-coded sample values.
let extraStatsCharts=[];
function renderDatasetFindings(){
  const root=$("datasetResults");
  if(!root || !datasetRows.length || !datasetHeaders.length) return;
  let section=$("datasetFindingsPanel");
  if(!section){
    section=document.createElement("section");
    section.id="datasetFindingsPanel";
    section.className="panel";
    section.style.marginBottom="18px";
    section.innerHTML='<div class="panel-head"><div><h2>Findings, Interpretation & Recommendations</h2><p>Generated from the currently loaded dataset. Findings are signals to investigate, not proof of cause.</p></div></div><div id="datasetFindingsGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px"></div><p id="datasetFindingsCaveat" style="font-size:12px;color:#8fa8ca;margin-top:12px"></p>';
    root.insertBefore(section,root.firstChild);
  }
  const grid=$("datasetFindingsGrid"); grid.innerHTML="";
  const cards=[];
  const clean=h=>datasetRows.map(r=>{const x=String(r[h]??"").trim().replace(/,/g,"");return x===""?NaN:Number(x)}).filter(Number.isFinite);
  const findCol=re=>datasetHeaders.find(h=>re.test(h));
  const fmt=v=>typeof fmtNumber==="function"?fmtNumber(v):Number(v).toLocaleString(undefined,{maximumFractionDigits:2});
  const add=(title,finding,interpretation,suggestion)=>{
    cards.push({title,finding,interpretation,suggestion});
  };
  const missing=datasetHeaders.map(h=>({h,n:datasetRows.filter(r=>String(r[h]??"").trim()==="").length}));
  const totalCells=datasetRows.length*datasetHeaders.length;
  const missingCount=missing.reduce((a,x)=>a+x.n,0);
  const worstMissing=[...missing].sort((a,b)=>b.n-a.n).filter(x=>x.n>0).slice(0,3);
  add("Data completeness",
    fmt(missingCount)+" of "+fmt(totalCells)+" cells are blank ("+(totalCells?((missingCount/totalCells)*100).toFixed(2):"0")+"%).",
    worstMissing.length?"Most missing values: "+worstMissing.map(x=>x.h+" ("+x.n+")").join(", ")+".":"No blank cells were found.",
    worstMissing.length?"Check whether these fields are optional or whether collection/export failed. Avoid replacing missing values with invented measurements.":"Keep checking completeness when new data is loaded.");
  const pcols=[
    {label:"P50",h:findCol(/(^|[^a-z0-9])p50([^a-z0-9]|$)|median/i)},
    {label:"P95",h:findCol(/(^|[^a-z0-9])p95([^a-z0-9]|$)/i)},
    {label:"P99",h:findCol(/(^|[^a-z0-9])p99([^a-z0-9]|$)/i)}
  ].filter(x=>x.h);
  if(pcols.length>=2){
    const avg=pcols.map(x=>({label:x.label,h:x.h,mean:(()=>{const v=clean(x.h);return v.length?v.reduce((a,b)=>a+b,0)/v.length:NaN})()}));
    const available=avg.filter(x=>Number.isFinite(x.mean));
    const p50=available.find(x=>x.label==="P50"), p95=available.find(x=>x.label==="P95"), p99=available.find(x=>x.label==="P99");
    add("Latency percentile pattern",
      available.map(x=>"Mean "+x.label+": "+fmt(x.mean)).join(" · "),
      p50&&p95&&p95.mean>p50.mean?"Reported P95 is higher than P50, indicating a higher-latency tail across the summarized records.":p95&&p50?"P50/P95 averages do not show P95 above P50; check column definitions and data quality.":"Percentile summary columns were found; compare their values and units.",
      "Inspect timestamps around high P95/P99 records and compare queue time, TTFT, request load and resource metrics. These are averages of reported percentiles, not percentiles recalculated from raw individual requests.");
  } else {
    add("Latency percentiles","P50/P95/P99 columns were not confidently identified.","The current file may use different column names or may not contain percentile summaries.","Review the column names and source documentation before drawing latency-tail conclusions.");
  }
  const resourceCols=[
    {label:"CPU",re:/cpu.*(util|usage|percent|pct)|(?:util|usage|percent|pct).*cpu/i},
    {label:"RAM",re:/ram.*(util|usage|percent|pct)|memory.*(util|usage|percent|pct)|(?:util|usage|percent|pct).*(ram|memory)/i},
    {label:"GPU",re:/gpu.*(util|usage|percent|pct)|(?:util|usage|percent|pct).*gpu/i}
  ];
  const resources=resourceCols.map(x=>({label:x.label,h:findCol(x.re)})).filter(x=>x.h);
  if(resources.length){
    const summaries=resources.map(x=>{const v=clean(x.h);return {...x,n:v.length,mean:v.length?v.reduce((a,b)=>a+b,0)/v.length:NaN,median:v.length?percentile(v,.5):NaN,max:v.length?Math.max(...v):NaN};});
    add("Resource utilization",
      summaries.map(x=>x.label+": mean "+fmt(x.mean)+(Number.isFinite(x.median)?", median "+fmt(x.median):"")).join(" · "),
      "These are overall summaries; they do not establish that CPU, RAM or GPU usage caused latency changes.",
      "Plot resource usage against latency by timestamp and compare high-latency intervals with the rest. Confirm percentage units and metric definitions first.");
  } else {
    add("Resource metrics","Recognizable CPU/RAM/GPU utilization columns were not detected by name matching.","Resource pressure cannot be assessed from this automatic summary alone.","Check dataset headers and add explicit mappings for resource fields if they use different names.");
  }
  const outlierRows=datasetHeaders.map(h=>{
    const vals=clean(h).sort((a,b)=>a-b);
    if(vals.length<4)return null;
    const q1=percentile(vals,.25),q3=percentile(vals,.75),iqr=q3-q1;
    const count=vals.filter(v=>v<q1-1.5*iqr||v>q3+1.5*iqr).length;
    return {h,count,n:vals.length,rate:count/vals.length};
  }).filter(x=>x&&x.count>0).sort((a,b)=>b.rate-a.rate).slice(0,3);
  add("Potential outliers",
    outlierRows.length?outlierRows.map(x=>x.h+": "+x.count+" ("+(x.rate*100).toFixed(2)+"%)").join(" · "):"No IQR outliers detected in the eligible numeric columns.",
    "IQR flags unusual values relative to each column's spread; a flagged value is not automatically an error or an incident.",
    outlierRows.length?"Review these records alongside timestamps and related metrics; retain valid extreme observations and correct only verified data errors.":"Re-run this check after loading new data and investigate any unusual latency spikes separately.");
  const timeCol=findCol(/timestamp|datetime|date.?time|^time$|^date$/i);
  const queueCol=findCol(/queue.*(time|latency|duration)|(?:time|latency|duration).*queue/i);
  const ttftCol=findCol(/ttft|time.?to.?first.?token/i);
  const requestCol=findCol(/request.*(rate|count|throughput)|throughput|requests.?per.?second/i);
  const factorNames=[queueCol&&"queue time",ttftCol&&"TTFT",requestCol&&"request rate"].filter(Boolean);
  add("Recommended next analysis",
    "Timestamp: "+(timeCol||"not detected")+" · Candidate factors: "+(factorNames.join(", ")||"inspect available columns"),
    "The current summaries describe the dataset overall. They do not prove a root cause or a relationship between variables.",
    timeCol?"Use timestamped records to compare latency during high- and low-latency intervals, then test associations with "+(factorNames.join(", ")||"available workload/resource metrics")+".":"Identify the time column and align metrics by interval before making claims about trends or causes.");
  cards.forEach(c=>{
    const card=document.createElement("article");
    card.style.cssText="border:1px solid #244365;border-radius:10px;padding:14px;background:rgba(15,35,60,.45)";
    const heading=document.createElement("h3");heading.textContent=c.title;heading.style.cssText="margin:0 0 8px;font-size:15px;color:#dceaff";
    card.appendChild(heading);
    [["Finding",c.finding],["Interpretation",c.interpretation],["Suggestion",c.suggestion]].forEach(([label,value])=>{
      const p=document.createElement("p");p.style.cssText="margin:7px 0;font-size:12px;line-height:1.55;color:#9fb7da";
      const strong=document.createElement("strong");strong.textContent=label+": ";strong.style.color="#28d8c3";
      p.appendChild(strong);p.appendChild(document.createTextNode(value));card.appendChild(p);
    });
    grid.appendChild(card);
  });
  $("datasetFindingsCaveat").textContent="Important: summaries are calculated from the currently loaded file. Units and metric definitions must be confirmed from the dataset documentation. Aggregated P50/P95/P99 columns are not raw request-level observations, and associations alone do not prove causation.";
}

function renderAdditionalStatisticsGraphs(){
  const root=$("datasetResults");
  if(!root || !datasetRows.length || !datasetHeaders.length) return;
  renderDatasetFindings();
  extraStatsCharts.forEach(c=>{try{c.destroy()}catch(e){}});
  extraStatsCharts=[];
  let section=$("additionalStatsGraphs");
  if(!section){
    section=document.createElement("section"); section.id="additionalStatsGraphs";
    section.innerHTML='<div class="panel dataset-upload-panel"><div class="panel-head"><div><h2>Complete Dataset Visualizations</h2><p>Graphs are selected automatically based on the columns and data types available.</p></div></div><div id="additionalStatsGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px"></div></div>';
    const summary=root.querySelector(".dataset-summary");
    root.insertBefore(section,summary||root.firstChild);
  }
  const grid=$("additionalStatsGrid"); grid.innerHTML="";
  const addCard=(title,description,id,height=270)=>{
    const card=document.createElement("div"); card.className="panel";
    card.innerHTML='<div class="panel-head"><div><h2>'+title+'</h2><p>'+description+'</p></div></div><div style="height:'+height+'px;position:relative"><canvas id="'+id+'"></canvas></div>';
    grid.appendChild(card); return $(id);
  };
  const clean=h=>datasetRows.map(r=>{const x=String(r[h]??"").trim().replace(/,/g,"");return x===""?NaN:Number(x)});
  const numeric=datasetHeaders.map(h=>({h,v:clean(h)})).filter(o=>o.v.filter(Number.isFinite).length>=Math.max(3,Math.floor(datasetRows.length*.5)));
  const categorical=datasetHeaders.filter(h=>!numeric.some(o=>o.h===h));
  const options={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:"#9fb7da"}},tooltip:{enabled:true}},scales:{x:{title:{display:true,text:"Category / feature",color:"#8fa8ca"},ticks:{color:"#8fa8ca",maxRotation:55,minRotation:0,autoSkip:true},grid:{color:"#173252"}},y:{title:{display:true,text:"Value / count",color:"#8fa8ca"},ticks:{color:"#8fa8ca"},grid:{color:"#173252"}}}};
  const mk=(id,type,data,opts={})=>{const c=new Chart($(id),{type,data,options:{...options,...opts}});extraStatsCharts.push(c);return c;};
  // Missingness across every feature.
  const missing=datasetHeaders.map(h=>datasetRows.filter(r=>String(r[h]??"").trim()==="").length);
  let cv=addCard("Missing Values by Feature","Counts of blank cells in every column.","statsMissingChart",300);
  mk(cv.id,"bar",{labels:datasetHeaders,datasets:[{label:"Missing values",data:missing,backgroundColor:"#ff987a"}]},{indexAxis:"y",scales:{x:{beginAtZero:true,title:{display:true,text:"Number of missing cells",color:"#8fa8ca"},ticks:{color:"#8fa8ca"},grid:{color:"#173252"}},y:{title:{display:true,text:"Dataset feature",color:"#8fa8ca"},ticks:{color:"#8fa8ca"},grid:{color:"#173252"}}}});
  // Compare pre-aggregated latency percentiles when the dataset provides them.
  const percentileCols = [
    {label:"P50", h:datasetHeaders.find(h=>/(^|[^a-z0-9])p50([^a-z0-9]|$)|median/i.test(h))},
    {label:"P95", h:datasetHeaders.find(h=>/(^|[^a-z0-9])p95([^a-z0-9]|$)/i.test(h))},
    {label:"P99", h:datasetHeaders.find(h=>/(^|[^a-z0-9])p99([^a-z0-9]|$)/i.test(h))}
  ].filter(x=>x.h);
  if(percentileCols.length >= 2){
    const averages=percentileCols.map(x=>{
      const vals=clean(x.h).filter(Number.isFinite);
      return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
    });
    cv=addCard("Latency Percentile Comparison","Mean of the available P50/P95/P99 summary columns across dataset rows. Confirm units in the source documentation.","statsPercentileCompare",300);
    mk(cv.id,"bar",{labels:percentileCols.map(x=>x.label),datasets:[{label:"Mean reported value",data:averages,backgroundColor:["#28d8c3","#287cff","#b35cff"].slice(0,percentileCols.length),borderRadius:4}]},{
      scales:{x:{title:{display:true,text:"Latency percentile",color:"#8fa8ca"},ticks:{color:"#8fa8ca"},grid:{display:false}},y:{beginAtZero:true,ticks:{color:"#8fa8ca"},grid:{color:"#173252"},title:{display:true,text:"Mean reported value (source units)",color:"#8fa8ca"}}}
    });
  }
  // Numeric histograms: handle constant columns, missing values, and readable axis labels safely.
  numeric.forEach((o,index)=>{
    const vals=o.v.filter(Number.isFinite), sorted=[...vals].sort((a,b)=>a-b);
    if(!sorted.length) return;
    const min=sorted[0],max=sorted[sorted.length-1];
    const bins=min===max?1:Math.min(20,Math.max(5,Math.ceil(Math.sqrt(vals.length))));
    const width=(max-min)/bins, counts=Array(bins).fill(0);
    vals.forEach(v=>{
      const bin=min===max?0:Math.min(bins-1,Math.max(0,Math.floor((v-min)/width)));
      counts[bin]++;
    });
    const labels=counts.map((_,i)=>min===max?fmtNumber(min):(fmtNumber(min+width*i)+"–"+fmtNumber(i===bins-1?max:min+width*(i+1))));
    cv=addCard("Distribution: "+o.h,"Histogram of "+vals.length.toLocaleString()+" valid numeric values.","statsHist"+index,260);
    mk(cv.id,"bar",{labels,datasets:[{label:"Row count",data:counts,backgroundColor:"#28d8c3",borderColor:"#28d8c3",borderWidth:1,borderRadius:3}]},{
      scales:{x:{title:{display:true,text:"Numeric value range",color:"#8fa8ca"},ticks:{color:"#8fa8ca",maxRotation:45,minRotation:0,autoSkip:true},grid:{display:false}},y:{beginAtZero:true,ticks:{color:"#8fa8ca",precision:0},grid:{color:"#173252"},title:{display:true,text:"Number of rows",color:"#8fa8ca"}}}
    });
  });
  // IQR outlier counts per numeric feature (not a five-number-summary chart).
  const outlierFeatures=numeric.map(o=>{
    const vals=o.v.filter(Number.isFinite).sort((a,b)=>a-b);
    if(vals.length<4) return null;
    const q1=percentile(vals,.25), q3=percentile(vals,.75), iqr=q3-q1;
    const low=q1-1.5*iqr, high=q3+1.5*iqr;
    const count=vals.filter(v=>v<low||v>high).length;
    return {label:o.h,count,valid:vals.length,rate:count/vals.length};
  }).filter(Boolean).sort((a,b)=>b.count-a.count).slice(0,15);
  if(outlierFeatures.some(x=>x.count>0)){
    cv=addCard("Potential Outliers by Feature","Top 15 numeric features by values outside 1.5×IQR fences. This flags unusual values for review; it does not prove errors.","statsOutlierChart",340);
    mk(cv.id,"bar",{labels:outlierFeatures.map(x=>x.label),datasets:[{label:"Potential outlier rows",data:outlierFeatures.map(x=>x.count),backgroundColor:"#ff987a",borderRadius:3}]},{
      indexAxis:"y",
      plugins:{tooltip:{callbacks:{afterLabel:ctx=>{const x=outlierFeatures[ctx.dataIndex];return x?("Valid values: "+x.valid.toLocaleString()+" | Outlier rate: "+(x.rate*100).toFixed(2)+"%"):"";}}}},
      scales:{x:{beginAtZero:true,ticks:{color:"#8fa8ca",precision:0},grid:{color:"#173252"},title:{display:true,text:"Rows outside IQR fences",color:"#8fa8ca"}},y:{title:{display:true,text:"Numeric feature",color:"#8fa8ca"},ticks:{color:"#8fa8ca"},grid:{display:false}}}
    });
  }

  // Five-number summary graph removed by request.

  // Numeric correlation visualization removed by request.

  // Top category frequencies for categorical fields (up to 6 fields).
  categorical.slice(0,6).forEach((h,index)=>{
    const freq=new Map();datasetRows.forEach(r=>{const v=String(r[h]??"").trim()||"(missing)";freq.set(v,(freq.get(v)||0)+1)});
    const top=[...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
    cv=addCard("Category Frequency: "+h,"Top 10 most common values.","statsCategory"+index,270);
    mk(cv.id,"bar",{labels:top.map(x=>x[0]),datasets:[{label:"Count",data:top.map(x=>x[1]),backgroundColor:"#7f8cff"}]},{indexAxis:"y",scales:{x:{beginAtZero:true,title:{display:true,text:"Record count",color:"#8fa8ca"},ticks:{color:"#8fa8ca"},grid:{color:"#173252"}},y:{title:{display:true,text:h,color:"#8fa8ca"},ticks:{color:"#8fa8ca"},grid:{color:"#173252"}}}});
  });
  if(!numeric.length && !categorical.length) grid.textContent="No graphable columns were found.";
}

function renderAllFeatureStatistics(){
  const tbody=$("allFeatureStatsTable").querySelector("tbody");
  const fmt=v=>Number.isFinite(v)?fmtNumber(v):"—";
  tbody.innerHTML="";
  datasetHeaders.forEach(h=>{
    const raw=datasetRows.map(r=>{const s=String(r[h]??"").trim().replace(/,/g,"");return s===""?NaN:Number(s);});
    const valid=raw.filter(Number.isFinite), missing=raw.length-valid.length;
    const numeric=valid.length>0 && valid.length>=Math.max(3,Math.floor(raw.length*.5));
    let st={};
    if(numeric){
      const sorted=[...valid].sort((a,b)=>a-b), n=valid.length, mean=valid.reduce((a,b)=>a+b,0)/n;
      const variance=n>1?valid.reduce((a,b)=>a+(b-mean)**2,0)/(n-1):NaN, sd=Math.sqrt(variance);
      const q=p=>percentile(sorted,p), q1=q(.25), median=q(.5), q3=q(.75), iqr=q3-q1;
      const m2=valid.reduce((a,b)=>a+(b-mean)**2,0)/n, m3=valid.reduce((a,b)=>a+(b-mean)**3,0)/n, m4=valid.reduce((a,b)=>a+(b-mean)**4,0)/n;
      st={n,mean,median,sd,variance,min:sorted[0],q1,q3,max:sorted[n-1],skew:m2>0?m3/Math.pow(m2,1.5):0,kurt:m2>0?m4/(m2*m2)-3:0,outliers:valid.filter(v=>v<q1-1.5*iqr||v>q3+1.5*iqr).length};
    }
    const tr=document.createElement("tr");tr.style.borderTop="1px solid #17304f";
    const cells=[h,numeric?"Numeric":"Categorical",numeric?st.n:raw.filter(v=>String(v??"").trim()!=="").length,missing,new Set(datasetRows.map(r=>String(r[h]??"").trim()).filter(v=>v!=="")).size,numeric?fmt(st.mean):"—",numeric?fmt(st.median):"—",numeric?fmt(st.sd):"—",numeric?fmt(st.variance):"—",numeric?fmt(st.min):"—",numeric?fmt(st.q1):"—",numeric?fmt(st.q3):"—",numeric?fmt(st.max):"—",numeric?fmt(st.skew):"—",numeric?fmt(st.kurt):"—",numeric?st.outliers.toLocaleString():"—"];
    cells.forEach((v,i)=>{const td=document.createElement("td");td.textContent=v;td.style.cssText="padding:8px 9px;color:#c5d5ec;white-space:nowrap";if(i===0)td.style.color="#fff";tr.appendChild(td);});
    tbody.appendChild(tr);
  });
}
async function loadBundledDataset(){
  $("datasetMessage").textContent="Loading repository dataset and calculating statistics for every feature…";
  try{
    const response=await fetch("https://raw.githubusercontent.com/AashinCT/Cloud-Probability-simulation-/main/data/sofie.csv",{cache:"no-store"});
    if(!response.ok) throw new Error("Could not fetch bundled dataset ("+response.status+").");
    const parsed=parseCSV(await response.text());
    if(parsed.length<2) throw new Error("The repository CSV is empty or invalid.");
    datasetHeaders=parsed[0].map((h,i)=>String(h).trim()||("Column "+(i+1)));
    datasetRows=parsed.slice(1).map(r=>Object.fromEntries(datasetHeaders.map((h,i)=>[h,(r[i]??"").trim()])));
    const select=$("latencyColumn");select.innerHTML="";
    datasetHeaders.forEach(h=>{const opt=document.createElement("option");opt.value=h;opt.textContent=h;select.appendChild(opt);});
    const likely=datasetHeaders.find(h=>/vllm.*(e2e.*latency|latency.*p50)|response.?time|latency/i.test(h));
    if(likely)select.value=likely;
    $("latencyUnit").value=/(_s|seconds?|time.?s)$/i.test(select.value)?"s":"ms";
    $("datasetControls").hidden=false;$("datasetResults").hidden=false;
    $("datasetMessage").textContent="Loaded repository dataset · "+datasetRows.length.toLocaleString()+" rows · "+datasetHeaders.length+" features. Full feature statistics are shown below.";
    renderAllFeatureStatistics();analyzeDataset();
  }catch(err){$("datasetMessage").textContent="Could not load repository dataset automatically: "+err.message+" Check GitHub Pages deployment and data/sofie.csv.";}
}
function analyzeDataset(){
  const col=$("latencyColumn").value, unit=$("latencyUnit").value, thresholdMs=Number($("slaThresholdInput").value), targetPercent=Number($("slaTargetInput").value);
  if(!datasetRows.length || !col){$("datasetMessage").textContent="Upload a valid CSV and choose a column first.";return;}
  if(!(thresholdMs>0)){ $("datasetMessage").textContent="Enter an SLA threshold greater than zero.";return;}
  if(!Number.isFinite(targetPercent)||targetPercent<0||targetPercent>100){ $("datasetMessage").textContent="Required SLA target must be between 0 and 100 percent.";return;}
  const raw=datasetRows.map(r=>{const s=String(r[col]??"").replace(/,/g,"").trim();return s===""?NaN:Number(s);});
  const valid=raw.filter(Number.isFinite);
  if(!valid.length){$("datasetMessage").textContent="The selected column contains no usable numeric values. Choose a numeric column.";return;}
  if(valid.some(v=>v<0)){ $("datasetMessage").textContent="Latency values must be non-negative. Choose a valid latency/metric column.";return;}
  const values=valid.map(v=>unit==="ms"?v/1000:v), sorted=[...values].sort((a,b)=>a-b);
  const n=values.length, mean=values.reduce((a,b)=>a+b,0)/n;
  const variance=values.reduce((a,b)=>a+(b-mean)**2,0)/n, sd=Math.sqrt(variance);
  const p50=percentile(values,.5), p95=percentile(values,.95), p99=percentile(values,.99);
  const lambda=mean>0?1/mean:NaN, threshold=thresholdMs/1000;
  const isRawLatency=!/^(p50|p95|p99|median|percentile)/i.test(col.replace(/[ _-]/g,""));
  const violations=values.filter(v=>v>threshold).length, compliance=(n-violations)/n*100;
  $("datasetResults").hidden=false;
  renderAdditionalStatisticsGraphs();
  $("datasetRowCount").textContent=datasetRows.length.toLocaleString()+" rows";
  $("datasetColumnLabel").textContent=col+" · "+unit;
  $("datasetDataType").textContent=isRawLatency?"Selected values":"Aggregated percentile snapshots";
  $("dsCount").textContent=n.toLocaleString();$("dsMean").textContent=ms(mean);
  $("dsLambda").textContent=Number.isFinite(lambda)?fmtNumber(lambda)+" /s":"N/A";
  $("dsVariance").textContent=fmtNumber(variance)+" s²";$("dsP95").textContent=ms(p95);$("dsP99").textContent=ms(p99);
  $("dsSla").textContent=compliance.toFixed(2)+"%";$("dsSlaNote").textContent="Observed ≤ "+thresholdMs+" ms";
  const modelViolation=Number.isFinite(lambda)?Math.exp(-lambda*threshold)*100:NaN;
  const modelCompliancePct=Number.isFinite(modelViolation)?100-modelViolation:NaN;
  const compliant=n-violations, passed=compliance>=targetPercent;
  const status=$("datasetSlaStatus");
  status.textContent=passed?"PASS":"SLA VIOLATION";
  status.className="sla-status "+(passed?"pass":"violation");
  $("dsSlaThreshold").textContent=thresholdMs+" ms";
  $("dsSlaTarget").textContent=targetPercent.toFixed(1)+"%";
  $("dsSlaActual").textContent=compliance.toFixed(2)+"%";
  $("dsSlaViolationCount").textContent=violations.toLocaleString();
  $("dsSlaModel").textContent=Number.isFinite(modelCompliancePct)?modelCompliancePct.toFixed(2)+"%":"N/A";
  $("dsSlaModelViolation").textContent=Number.isFinite(modelViolation)?modelViolation.toFixed(2)+"%":"N/A";
  $("dsSlaTotal").textContent=n.toLocaleString();
  $("dsSlaCompliant").textContent=compliant.toLocaleString();
  $("dsSlaViolating").textContent=violations.toLocaleString();
  $("dsSlaLambda").textContent=Number.isFinite(lambda)?fmtNumber(lambda)+" /s":"N/A";
  $("dsSlaInterpretation").textContent=(passed?"Observed data meets the required target. ":"Observed data misses the required target. ")+compliance.toFixed(2)+"% of valid values are within "+thresholdMs+" ms; target is "+targetPercent.toFixed(1)+"%. "+(isRawLatency?"The model estimate assumes an exponential latency distribution and may differ from observed results.":"This appears to be aggregated percentile/summary data, so SLA results describe these rows rather than individual requests.");
  $("dsDelay").textContent=Number.isFinite(lambda)?(Math.exp(-lambda*threshold)*100).toFixed(2)+"%":"N/A";
  $("dsMin").textContent=ms(sorted[0]);$("dsMax").textContent=ms(sorted[n-1]);$("dsStd").textContent=ms(sd);$("dsMedian").textContent=ms(p50);
  $("dsInvalid").textContent=(raw.length-n).toLocaleString();$("dsViolations").textContent=violations.toLocaleString();
  $("datasetMessage").textContent="Analysis complete. Dataset results are separate from live server measurements.";
  const caveat=$("datasetCaveat");caveat.hidden=false;
  caveat.textContent=isRawLatency
    ?"Model note: λ and P(X > threshold) assume independent, exponentially distributed request latencies. Compare model estimates with observed compliance; the exponential assumption may not fit real traffic."
    :"This column appears to contain pre-aggregated percentile/summary values. Statistics and percentiles shown are across these snapshots, not individual HTTP requests; do not interpret λ or the fitted exponential curve as a request-level model.";
  const valsMs=values.map(v=>v*1000), max=Math.max(...valsMs,thresholdMs), min=Math.min(...valsMs), bins=12, step=(max-min||1)/bins, counts=Array(bins).fill(0);
  valsMs.forEach(v=>counts[Math.min(bins-1,Math.floor((v-min)/step))]++);
  destroyDatasetCharts();
  const chartText="#9fb7da", grid="#173252";
  datasetHistoryChart=new Chart($("datasetHistoryChart"),{type:"line",data:{labels:valsMs.map((_,i)=>i+1),datasets:[{label:col+" (ms)",data:valsMs,borderColor:"#2c80ff",backgroundColor:"rgba(44,128,255,.12)",fill:true,tension:.2,pointRadius:1}]},options:baseChartOptions("Latency (ms)","Record sequence")});
  datasetHistogramChart=new Chart($("datasetHistogramChart"),{type:"bar",data:{labels:counts.map((_,i)=>(min+i*step).toFixed(2)+"–"+(min+(i+1)*step).toFixed(2)),datasets:[{label:"Rows",data:counts,backgroundColor:"#28d8c3",borderRadius:3}]},options:baseChartOptions("Record count","Latency range (ms)")});
  datasetDistributionBars=new Chart($("datasetDistributionBars"),{type:"bar",data:{labels:counts.map((_,i)=>(min+i*step).toFixed(1)+"–"+(min+(i+1)*step).toFixed(1)+" ms"),datasets:[{label:"Requests",data:counts,backgroundColor:"#287cff",borderRadius:3}]},options:baseChartOptions("Request count","Latency range (ms)")});
  const xmax=Math.max(sorted[n-1],threshold), points=Array.from({length:40},(_,i)=>i*xmax/39);
  datasetModelChart=new Chart($("datasetModelChart"),{type:"line",data:{labels:points.map(x=>(x*1000).toFixed(2)),datasets:[
    {label:"Exponential density (scaled)",data:Number.isFinite(lambda)?points.map(x=>lambda*Math.exp(-lambda*x)*n*(xmax/39)):[],borderColor:"#b35cff",pointRadius:0,borderWidth:2,tension:.2}
  ]},options:baseChartOptions("Scaled density","Latency (ms)")});
  // Match the live dashboard's response-time-vs-CPU and response-time-vs-RAM scatter charts when those columns exist.
  const normalized=h=>h.toLowerCase().replace(/[^a-z0-9]/g,"");
  const findColumn=patterns=>datasetHeaders.find(h=>patterns.some(p=>p.test(normalized(h))));
  const cpuCol=findColumn([/^cpu(percent|usage|utilization)?$/, /^cpupercent$/]);
  const ramCol=findColumn([/^ram(percent|usage)?$/, /^memory(percent|usage|utilization)?$/, /^rampercent$/, /^memorypercent$/]);
  const responseCol=datasetHeaders.find(h=>/response.?time|latency|duration|elapsed/i.test(h))||col;
  const getNumbers=h=>datasetRows.map(r=>{const s=String(r[h]??"").replace(/,/g,"").trim();return s===""?NaN:Number(s);});
  const responseRaw=getNumbers(responseCol);
  const responseMs=responseRaw.map(v=>responseCol===col?v*(unit==="s"?1000:1):v*(/(_s|seconds?|time.?s)$/i.test(responseCol)?1000:1));
  const scatter=(canvasId,noteId,metricCol,label,color)=>{
    const metric=metricCol?getNumbers(metricCol):[];
    const pts=metric.map((v,i)=>({x:v,y:responseMs[i]})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
    $(noteId).textContent=pts.length?("Using "+metricCol+" and "+responseCol+"."):"No suitable "+label+" column found in this CSV; add one to enable this graph.";
    return new Chart($(canvasId),{type:"scatter",data:{datasets:[{label:"Response time vs "+label,data:pts,backgroundColor:color,borderColor:color,pointRadius:3}]},options:{...baseChartOptions("Response time (ms)","Resource utilisation (%)"),scales:{x:{title:{display:true,text:label+" utilisation (%)",color:"#7894b9",font:{size:10}},ticks:{color:"#6f89ad",font:{size:9}},grid:{color:"#173252"}},y:{title:{display:true,text:"Response time (ms)",color:"#7894b9",font:{size:10}},ticks:{color:"#6f89ad",font:{size:9}},grid:{color:"#173252"}}}}});
  };
  datasetCpuChart=scatter("datasetCpuChart","datasetCpuNote",cpuCol,"CPU","#2c80ff");
  datasetRamChart=scatter("datasetRamChart","datasetRamNote",ramCol,"RAM","#28d8c3");
  const chartModelCompliance=Number.isFinite(lambda)?(1-Math.exp(-lambda*threshold))*100:0;
  datasetSlaChart=new Chart($("datasetSlaChart"),{type:"bar",data:{labels:["SLA compliance","SLA violations"],datasets:[
    {label:"Observed (%)",data:[compliance,100-compliance],backgroundColor:"#287cff"},
    {label:"Exponential model (%)",data:[chartModelCompliance,100-chartModelCompliance],backgroundColor:"#b35cff"}
  ]},options:{...baseChartOptions("Percent (%)","SLA outcome"),scales:{...baseChartOptions("Percent (%)","SLA outcome").scales,y:{...baseChartOptions("Percent (%)","SLA outcome").scales.y,min:0,max:100}}}});
}

// Deployment refresh: dashboard uses the four implemented API endpoints.
