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

function baseChartOptions(yTitle) {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{labels:{color:"#9fb7da",font:{size:10}}}},
    scales:{
      x:{ticks:{color:"#6f89ad",font:{size:9}},grid:{color:"#173252"}},
      y:{ticks:{color:"#6f89ad",font:{size:9}},grid:{color:"#173252"},title:{display:true,text:yTitle,color:"#7894b9",font:{size:9}}}
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
    options:baseChartOptions("Milliseconds")
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
    options:baseChartOptions("Requests")
  });

  const lambda = 1 / (data.reduce((a,b)=>a+b,0)/data.length);
  const points = Array.from({length:40},(_,i)=>i*max/39);
  const fit = points.map(x => lambda*Math.exp(-lambda*x));

  if(distributionChart) distributionChart.destroy();
  distributionChart = new Chart($("distributionChart"), {
    type:"line",
    data:{labels:points.map(x=>(x*1000).toFixed(0)),datasets:[{label:"Exponential fit",data:fit,borderColor:"#c05cff",borderWidth:2,pointRadius:0,tension:.25}]},
    options:{...baseChartOptions("Probability density"),scales:{...baseChartOptions("Probability density").scales,x:{...baseChartOptions("Probability density").scales.x,title:{display:true,text:"Response time (ms)",color:"#7894b9",font:{size:9}}}}}
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
      x:{title:{display:true,text:"Server metric (%)",color:"#7894b9",font:{size:9}},ticks:{color:"#6f89ad",font:{size:9}},grid:{color:"#173252"}},
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
          x:{ticks:{color:"#9fb7da",font:{size:9}},grid:{color:"#173252"}},
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
function renderAdditionalStatisticsGraphs(){
  const root=$("datasetResults");
  if(!root || !datasetRows.length || !datasetHeaders.length) return;
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
  const options={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:"#9fb7da"}},tooltip:{enabled:true}},scales:{x:{ticks:{color:"#8fa8ca",maxRotation:55,minRotation:0},grid:{color:"#173252"}},y:{ticks:{color:"#8fa8ca"},grid:{color:"#173252"}}}};
  const mk=(id,type,data,opts={})=>{const c=new Chart($(id),{type,data,options:{...options,...opts}});extraStatsCharts.push(c);return c;};
  // Missingness across every feature.
  const missing=datasetHeaders.map(h=>datasetRows.filter(r=>String(r[h]??"").trim()==="").length);
  let cv=addCard("Missing Values by Feature","Counts of blank cells in every column.","statsMissingChart",300);
  mk(cv.id,"bar",{labels:datasetHeaders,datasets:[{label:"Missing values",data:missing,backgroundColor:"#ff987a"}]},{indexAxis:"y",scales:{x:{beginAtZero:true,ticks:{color:"#8fa8ca"},grid:{color:"#173252"}},y:{ticks:{color:"#8fa8ca"},grid:{color:"#173252"}}}});
  // Numeric distributions, one histogram per numeric column (limit is visual layout only, not stats table).
  numeric.forEach((o,index)=>{
    const vals=o.v.filter(Number.isFinite), sorted=[...vals].sort((a,b)=>a-b);
    const min=sorted[0],max=sorted[sorted.length-1],bins=Math.min(20,Math.max(5,Math.ceil(Math.sqrt(vals.length)))),width=(max-min)||1,counts=Array(bins).fill(0);
    vals.forEach(v=>counts[Math.min(bins-1,Math.floor((v-min)/width*bins))]++);
    const labels=counts.map((_,i)=>(min+width*i/bins).toPrecision(4)+"–"+(min+width*(i+1)/bins).toPrecision(4));
    cv=addCard("Distribution: "+o.h,"Histogram of observed numeric values.", "statsHist"+index,250);
    mk(cv.id,"bar",{labels,datasets:[{label:"Rows",data:counts,backgroundColor:"#28d8c3"}]});
  });
  // Box-plot-style five-number summary graph (min, Q1, median, Q3, max).
  if(numeric.length){
    const percentileLocal=(a,p)=>{const x=(a.length-1)*p,l=Math.floor(x),u=Math.ceil(x);return a[l]+(a[u]-a[l])*(x-l)};
    const rows=numeric.map(o=>{const a=o.v.filter(Number.isFinite).sort((x,y)=>x-y);return {h:o.h,min:a[0],q1:percentileLocal(a,.25),med:percentileLocal(a,.5),q3:percentileLocal(a,.75),max:a[a.length-1]};});
    cv=addCard("Five-number summaries","Minimum, Q1, median, Q3 and maximum for numeric features.","statsFiveNumberChart",Math.max(280,rows.length*34));
    // Use five point series so each statistic is visible for each feature.
    mk(cv.id,"scatter",{datasets:[
      {label:"Minimum",data:rows.map((r,i)=>({x:r.min,y:i})),backgroundColor:"#ff987a",pointRadius:4},
      {label:"Q1",data:rows.map((r,i)=>({x:r.q1,y:i})),backgroundColor:"#ffc857",pointRadius:4},
      {label:"Median",data:rows.map((r,i)=>({x:r.med,y:i})),backgroundColor:"#28d8c3",pointRadius:5},
      {label:"Q3",data:rows.map((r,i)=>({x:r.q3,y:i})),backgroundColor:"#6e9bff",pointRadius:4},
      {label:"Maximum",data:rows.map((r,i)=>({x:r.max,y:i})),backgroundColor:"#c18bff",pointRadius:4}
    ]},{scales:{x:{type:"linear",title:{display:true,text:"Feature value",color:"#8fa8ca"},ticks:{color:"#8fa8ca"},grid:{color:"#173252"}},y:{type:"linear",reverse:true,min:-.5,max:rows.length-.5,ticks:{stepSize:1,color:"#8fa8ca",callback:v=>rows[v]?.h??""},grid:{color:"#173252"}}}});
  }
  // Correlation matrix for up to 12 numeric columns to keep labels legible.
  const corrCols=numeric.slice(0,12);
  if(corrCols.length>=2){
    const corr=(a,b)=>{const pairs=a.map((x,i)=>[x,b[i]]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));if(pairs.length<3)return NaN;const ma=pairs.reduce((s,p)=>s+p[0],0)/pairs.length,mb=pairs.reduce((s,p)=>s+p[1],0)/pairs.length;let n=0,da=0,db=0;pairs.forEach(p=>{n+=(p[0]-ma)*(p[1]-mb);da+=(p[0]-ma)**2;db+=(p[1]-mb)**2});return da&&db?n/Math.sqrt(da*db):0};
    cv=addCard("Numeric Correlation Matrix","Pearson correlation between numeric features (first 12 numeric columns).","statsCorrelationChart",Math.max(320,corrCols.length*34));
    const canvas=cv,ctx=canvas.getContext("2d"),dpr=window.devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;
    canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);ctx.fillStyle="#0b1728";ctx.fillRect(0,0,w,h);
    const left=115,top=18,cell=Math.min((w-left-8)/corrCols.length,(h-top-8)/corrCols.length,42);
    corrCols.forEach((a,i)=>{corrCols.forEach((b,j)=>{const r=corr(a.v,b.v),v=Number.isFinite(r)?r:0;ctx.fillStyle=v>=0?"rgba(40,216,195,"+(0.12+Math.abs(v)*.78)+")":"rgba(255,126,150,"+(0.12+Math.abs(v)*.78)+")";ctx.fillRect(left+j*cell,top+i*cell,cell-2,cell-2);ctx.fillStyle="#eef5ff";ctx.font="10px Inter, sans-serif";ctx.textAlign="center";ctx.fillText(Number.isFinite(r)?r.toFixed(2):"—",left+j*cell+(cell-2)/2,top+i*cell+cell/2+3)});ctx.save();ctx.translate(left-7,top+i*cell+cell/2);ctx.rotate(-.25);ctx.textAlign="right";ctx.fillStyle="#b7c9e2";ctx.font="10px Inter, sans-serif";ctx.fillText(a.h,0,0);ctx.restore();});
  }
  // Top category frequencies for categorical fields (up to 6 fields).
  categorical.slice(0,6).forEach((h,index)=>{
    const freq=new Map();datasetRows.forEach(r=>{const v=String(r[h]??"").trim()||"(missing)";freq.set(v,(freq.get(v)||0)+1)});
    const top=[...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
    cv=addCard("Category Frequency: "+h,"Top 10 most common values.","statsCategory"+index,270);
    mk(cv.id,"bar",{labels:top.map(x=>x[0]),datasets:[{label:"Count",data:top.map(x=>x[1]),backgroundColor:"#7f8cff"}]},{indexAxis:"y",scales:{x:{beginAtZero:true,ticks:{color:"#8fa8ca"},grid:{color:"#173252"}},y:{ticks:{color:"#8fa8ca"},grid:{color:"#173252"}}}});
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
  datasetHistoryChart=new Chart($("datasetHistoryChart"),{type:"line",data:{labels:valsMs.map((_,i)=>i+1),datasets:[{label:col+" (ms)",data:valsMs,borderColor:"#2c80ff",backgroundColor:"rgba(44,128,255,.12)",fill:true,tension:.2,pointRadius:1}]},options:baseChartOptions("Milliseconds")});
  datasetHistogramChart=new Chart($("datasetHistogramChart"),{type:"bar",data:{labels:counts.map((_,i)=>(min+i*step).toFixed(2)+"–"+(min+(i+1)*step).toFixed(2)),datasets:[{label:"Rows",data:counts,backgroundColor:"#28d8c3",borderRadius:3}]},options:baseChartOptions("Rows")});
  datasetDistributionBars=new Chart($("datasetDistributionBars"),{type:"bar",data:{labels:counts.map((_,i)=>(min+i*step).toFixed(1)+"–"+(min+(i+1)*step).toFixed(1)+" ms"),datasets:[{label:"Requests",data:counts,backgroundColor:"#287cff",borderRadius:3}]},options:baseChartOptions("Requests")});
  const xmax=Math.max(sorted[n-1],threshold), points=Array.from({length:40},(_,i)=>i*xmax/39);
  datasetModelChart=new Chart($("datasetModelChart"),{type:"line",data:{labels:points.map(x=>(x*1000).toFixed(2)),datasets:[
    {label:"Exponential density (scaled)",data:Number.isFinite(lambda)?points.map(x=>lambda*Math.exp(-lambda*x)*n*(xmax/39)):[],borderColor:"#b35cff",pointRadius:0,borderWidth:2,tension:.2}
  ]},options:{...baseChartOptions("Scaled density"),scales:{...baseChartOptions("Scaled density").scales,x:{...baseChartOptions("Scaled density").scales.x,title:{display:true,text:"Value (ms)",color:"#7894b9",font:{size:9}}}}}});
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
    return new Chart($(canvasId),{type:"scatter",data:{datasets:[{label:"Response time vs "+label,data:pts,backgroundColor:color,borderColor:color,pointRadius:3}]},options:{...baseChartOptions("Response time (ms)"),scales:{x:{title:{display:true,text:label+" (%)",color:"#7894b9",font:{size:9}},ticks:{color:"#6f89ad",font:{size:9}},grid:{color:"#173252"}},y:{title:{display:true,text:"Response time (ms)",color:"#7894b9",font:{size:9}},ticks:{color:"#6f89ad",font:{size:9}},grid:{color:"#173252"}}}}});
  };
  datasetCpuChart=scatter("datasetCpuChart","datasetCpuNote",cpuCol,"CPU","#2c80ff");
  datasetRamChart=scatter("datasetRamChart","datasetRamNote",ramCol,"RAM","#28d8c3");
  const chartModelCompliance=Number.isFinite(lambda)?(1-Math.exp(-lambda*threshold))*100:0;
  datasetSlaChart=new Chart($("datasetSlaChart"),{type:"bar",data:{labels:["SLA compliance","SLA violations"],datasets:[
    {label:"Observed (%)",data:[compliance,100-compliance],backgroundColor:"#287cff"},
    {label:"Exponential model (%)",data:[chartModelCompliance,100-chartModelCompliance],backgroundColor:"#b35cff"}
  ]},options:{...baseChartOptions("Percent (%)"),scales:{...baseChartOptions("Percent (%)").scales,y:{...baseChartOptions("Percent (%)").scales.y,min:0,max:100}}}});
}

// Deployment refresh: dashboard uses the four implemented API endpoints.
