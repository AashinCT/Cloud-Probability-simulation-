const API_BASE = "http://127.0.0.1:8000";
const SLA_LIMIT = 0.100;
let historyChart, distributionChart, distributionBars, cpuChart, ramChart;

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
    const [metricsRes, timesRes, serverRes] = await Promise.all([
      fetch(API_BASE + "/api/metrics"),
      fetch(API_BASE + "/api/response-times"),
      fetch(API_BASE + "/api/server-metrics")
    ]);
    if (!metricsRes.ok || !timesRes.ok || !serverRes.ok) throw new Error("API unavailable");

    const metrics = await metricsRes.json();
    const times = (await timesRes.json()).response_times || [];
    const records = (await serverRes.json()).metrics || [];

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
