async function loadDashboard() {
  const res = await fetch("/api/dashboard");
  const data = await res.json();
  const u = data.user;

  document.querySelector("#balance").textContent = `$${u.balance.toFixed(2)}`;
  document.querySelector("#commission").textContent = `$${u.commission.toFixed(2)}`;
  document.querySelector("#completed").textContent = u.completed;
  document.querySelector("#totalTasks").textContent = u.totalTasks;
  document.querySelector("#trade").textContent = `$${(data.activity.filter(x => x.type === "task").reduce((s,x) => s + x.tradeAmount, 0)).toFixed(2)}`;
  document.querySelector("#startBtn").textContent = `Start Single Match (${u.completed}/${u.totalTasks})`;
  document.querySelector("#bar").style.width = `${(u.completed/u.totalTasks)*100}%`;

  document.querySelector("#products").innerHTML = data.products.map(p => `
    <article class="product">
      <img src="${p.image}" alt="">
      <div class="product-name">${p.name}</div>
      <b>$${p.price.toFixed(2)}</b>
    </article>`).join("");

  document.querySelector("#activity").innerHTML = data.activity.length
    ? data.activity.map(x => x.type === "credit"
      ? `<div class="activity"><span>Demo amount added</span><b>+$${x.amount.toFixed(2)}</b></div>`
      : `<div class="activity"><span>${x.product}</span><b>+$${x.commission.toFixed(2)}</b></div>`
    ).join("")
    : `<div class="empty">No activity yet.</div>`;
}

document.querySelector("#startBtn").onclick = async () => {
  const btn = document.querySelector("#startBtn");
  btn.disabled = true;
  btn.textContent = "Processing demo task…";
  const res = await fetch("/api/task/start", {method:"POST"});
  const data = await res.json();
  if (!res.ok) alert(data.error);
  await loadDashboard();
  btn.disabled = false;
};

loadDashboard();
// Simple navigation between Home and the screenshot-inspired My/Profile page.
const homePage = document.querySelector("#homePage");
const profilePage = document.querySelector("#profilePage");
const navButtons = document.querySelectorAll(".bottom-nav button");

function showPage(page) {
  const isProfile = page === "profile";
  homePage.hidden = isProfile;
  profilePage.hidden = !isProfile;
  navButtons.forEach(b => b.classList.toggle("active", b.dataset.page === page));
  if (isProfile) syncProfile();
}

function syncProfile() {
  document.querySelector("#profileBalance").textContent =
    `$${Number(document.querySelector("#balance").textContent.replace("$","")).toFixed(0)}`;
  document.querySelector("#profileAvailable").textContent =
    document.querySelector("#balance").textContent;
  document.querySelector("#profileTrade").textContent =
    document.querySelector("#trade").textContent;
}

navButtons.forEach(btn => btn.addEventListener("click", () => {
  const page = btn.dataset.page;
  if (page === "profile" || page === "home") showPage(page);
  else alert("This section is ready for the next module.");
}));
document.querySelector("#profileBack").onclick = () => showPage("home");

document.querySelectorAll(".recharge").forEach(btn => btn.onclick = () => {
  window.location.href = "/admin.html";
});
document.querySelectorAll(".withdraw").forEach(btn => btn.onclick = () => {
  alert("Withdraw page is ready to connect to your approved demo workflow.");
});
