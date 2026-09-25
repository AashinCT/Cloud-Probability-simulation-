const API_BASE = "http://127.0.0.1:8000";
const SLA_LIMIT = 0.100;
let historyChart, distributionChart, distributionBars;

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
  const step = max / bins;
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
    data:{
      labels:points.map(x=>(x*1000).toFixed(0)),
      datasets:[
        {label:"Exponential fit",data:fit,borderColor:"#c05cff",borderWidth:2,pointRadius:0,tension:.25},
      ]
    },
    options:{...baseChartOptions("Probability density"),scales:{...baseChartOptions("Probability density").scales,x:{...baseChartOptions("Probability density").scales.x,title:{display:true,text:"Response time (ms)",color:"#7894b9",font:{size:9}}}}}
  });
}

async function loadDashboard() {
  try {
    const [metricsRes, timesRes] = await Promise.all([
      fetch(API_BASE + "/api/metrics"),
      fetch(API_BASE + "/api/response-times")
    ]);
    if (!metricsRes.ok || !timesRes.ok) throw new Error("API unavailable");

    const metrics = await metricsRes.json();
    const times = (await timesRes.json()).response_times || [];

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

    $("serverStatus").textContent = "Server Online";
    renderCharts(times);

    const recent = times.slice(-10).reverse();
    $("liveFeed").innerHTML = recent.map((v,i)=>{
      const delayed = v > SLA_LIMIT;
      return '<div class="feed-row"><span>'+(times.length-i)+'</span><span>'+v.toFixed(3)+' s</span><span class="'+(delayed?'delay':'ok')+'">'+(delayed?'⚠ Delay':'✓ OK')+'</span></div>';
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
