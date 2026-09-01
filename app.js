let currentUserId = Number(localStorage.getItem("demoUserId") || 1);

async function loadDashboard() {
  const res = await fetch(`/api/dashboard?userId=${currentUserId}`);
  const data = await res.json();
  if (!res.ok) return alert(data.error || "Could not load dashboard.");
  const u = data.user;
  document.querySelector("#balance").textContent = `$${Number(u.balance).toFixed(2)}`;
  document.querySelector("#commission").textContent = `$${Number(u.commission).toFixed(2)}`;
  document.querySelector("#completed").textContent = u.completed;
  document.querySelector("#totalTasks").textContent = u.totalTasks;
  document.querySelector("#trade").textContent = `$${data.activity.filter(x => x.type === "task").reduce((s,x) => s + Number(x.tradeAmount || 0), 0).toFixed(2)}`;
  document.querySelector("#startBtn").textContent = `Start Single Match (${u.completed}/${u.totalTasks})`;
  document.querySelector("#bar").style.width = `${(u.completed/u.totalTasks)*100}%`;
  document.querySelector("#profileName").textContent = u.phone || u.name;
  document.querySelector("#products").innerHTML = data.products.map(p => `<article class="product"><img src="${p.image}" alt=""><div class="product-name">${p.name}</div><b>$${p.price.toFixed(2)}</b></article>`).join("");
  document.querySelector("#activity").innerHTML = data.activity.length ? data.activity.map(x => {
    if (x.type === "credit") return `<div class="activity"><span>Demo amount added</span><b>+$${Number(x.amount).toFixed(2)}</b></div>`;
    if (x.type === "withdraw") return `<div class="activity"><span>Demo withdrawal (simulated)</span><b>-$${Number(x.amount).toFixed(2)}</b></div>`;
    if (x.type === "task") return `<div class="activity"><span>${x.product}</span><b>+$${Number(x.commission).toFixed(2)}</b></div>`;
    return `<div class="activity"><span>${x.note || x.type}</span><b>•</b></div>`;
  }).join("") : `<div class="empty">No activity yet.</div>`;
}

document.querySelector("#startBtn").onclick = async () => {
  const btn = document.querySelector("#startBtn"); btn.disabled = true; btn.textContent = "Processing demo task…";
  const res = await fetch("/api/task/start", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({userId:currentUserId})});
  const data = await res.json(); if (!res.ok) alert(data.error); await loadDashboard(); btn.disabled = false;
};

const homePage = document.querySelector("#homePage");
const profilePage = document.querySelector("#profilePage");
const navButtons = document.querySelectorAll(".bottom-nav button");
function showPage(page) { const isProfile = page === "profile"; homePage.hidden=isProfile; profilePage.hidden=!isProfile; navButtons.forEach(b=>b.classList.toggle("active",b.dataset.page===page)); if(isProfile)syncProfile(); }
function syncProfile(){ document.querySelector("#profileBalance").textContent=`$${Number(document.querySelector("#balance").textContent.replace("$","")).toFixed(0)}`; document.querySelector("#profileAvailable").textContent=document.querySelector("#balance").textContent; document.querySelector("#profileTrade").textContent=document.querySelector("#trade").textContent; }
navButtons.forEach(btn=>btn.addEventListener("click",()=>{const page=btn.dataset.page;if(page==="profile"||page==="home")showPage(page);else alert("This section is ready for the next demo module.");}));
document.querySelector("#profileBack").onclick=()=>showPage("home");
document.querySelectorAll(".recharge").forEach(btn=>btn.onclick=()=>alert("Recharge is disabled in demo mode. No real money is accepted."));
document.querySelectorAll(".withdraw").forEach(btn=>btn.onclick=async()=>{ if(!confirm("Simulate withdrawal of your full virtual balance? No cash will be transferred."))return; const r=await fetch("/api/withdraw",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:currentUserId})}); const d=await r.json(); if(!r.ok)return alert(d.error); alert(`Demo withdrawal recorded: $${Number(d.amount).toFixed(2)}. Virtual balance is now $0.00.`); await loadDashboard(); syncProfile(); });
loadDashboard();
