const GAME_KEY = "ecoGameSession_v4";
const TOTAL_TIME = 7 * 60;
const CHALLENGE_NO = 1;
const nextPage = "challenge2.html";

const TRASH_ITEMS = [
  {id:"banana",icon:"🍌",name:"Kulit pisang",category:"organic",explanation:"Kulit pisang berasal dari tumbuhan, jadi termasuk sampah organik."},
  {id:"leaf",icon:"🍂",name:"Daun kering",category:"organic",explanation:"Daun yang gugur termasuk sampah organik."},
  {id:"apple",icon:"🍎",name:"Sisa apel",category:"organic",explanation:"Sisa buah mudah terurai dan termasuk organik."},
  {id:"rice",icon:"🍚",name:"Sisa nasi",category:"organic",explanation:"Sisa makanan seperti nasi termasuk sampah organik."},
  {id:"flower",icon:"🌸",name:"Bunga layu",category:"organic",explanation:"Bunga berasal dari tumbuhan sehingga termasuk organik."},
  {id:"bottle",icon:"🧴",name:"Botol plastik",category:"plastic",explanation:"Botol berbahan plastik masuk kelompok sampah plastik."},
  {id:"cup",icon:"🥤",name:"Gelas plastik",category:"plastic",explanation:"Gelas plastik adalah sampah plastik."},
  {id:"bag",icon:"🛍️",name:"Kantong plastik",category:"plastic",explanation:"Kantong plastik termasuk sampah plastik."},
  {id:"wrapper",icon:"🍬",name:"Bungkus permen",category:"plastic",explanation:"Bungkus permen berbahan kemasan plastik termasuk plastik."},
  {id:"straw",icon:"🥤",name:"Sedotan",category:"plastic",explanation:"Sedotan plastik termasuk sampah plastik."},
  {id:"newspaper",icon:"📰",name:"Koran",category:"paper",explanation:"Koran terbuat dari kertas dan termasuk sampah kertas."},
  {id:"cardboard",icon:"📦",name:"Kardus",category:"paper",explanation:"Kardus berbahan kertas sehingga masuk kelompok kertas."},
  {id:"notebook",icon:"📓",name:"Buku lama",category:"paper",explanation:"Buku kertas termasuk sampah kertas yang dapat dikumpulkan untuk didaur ulang."},
  {id:"paper",icon:"📄",name:"Lembar kertas",category:"paper",explanation:"Lembar kertas masuk kelompok sampah kertas."},
  {id:"paperbag",icon:"🛍️",name:"Kantong kertas",category:"paper",explanation:"Kantong ini dibuat dari kertas, bukan plastik."}
];

let session = null;
let timerHandle = null;
let hintTimer = null;
let drag = null;
let selectedId = null;

const $ = (id) => document.getElementById(id);
const tutorialScreen = $("tutorialScreen");
const gameArea = $("gameArea");
const timeoutScreen = $("timeoutScreen");
const trashItemsEl = $("trashItems");
const progressText = $("progressText");
const timerText = $("timerText");
const feedback = $("feedback");
const feedbackIcon = $("feedbackIcon");
const feedbackTitle = $("feedbackTitle");
const feedbackText = $("feedbackText");
const hintBox = $("hintBox");
const speechBubble = $("speechBubble");

function makeDefaultSession() {
  return {
    version:4, started:false, status:"instruction", timeRemaining:TOTAL_TIME, lastUpdatedAt:Date.now(),
    currentChallenge:1, challengeStarted:[false,false,false,false], completed:[false,false,false,false],
    score:0, totalCorrect:0, totalWrong:0,
    challenge1:{order:shuffle(TRASH_ITEMS.map(x=>x.id)), sorted:[]}
  };
}
function shuffle(arr){return [...arr].sort(()=>Math.random()-.5)}
function save(){localStorage.setItem(GAME_KEY,JSON.stringify(session))}
function load(){
  try{return JSON.parse(localStorage.getItem(GAME_KEY)||"null")}catch{return null}
}
function syncTime(){
  if(!session || session.status!=="playing") return;
  const now=Date.now();
  const elapsed=Math.floor((now-session.lastUpdatedAt)/1000);
  if(elapsed<=0)return;
  session.timeRemaining=Math.max(0,session.timeRemaining-elapsed);
  session.lastUpdatedAt=now;
  if(session.timeRemaining<=0){session.timeRemaining=0;session.status="timeup";save();showTimeout();return}
  save(); updateHud();
}
function startGlobalTimer(){
  clearInterval(timerHandle);
  syncTime();
  timerHandle=setInterval(syncTime,250);
  document.addEventListener("visibilitychange",syncTime);
}
function updateHud(){
  const done=session?.challenge1?.sorted?.length||0;
  progressText.textContent=`${done}/${TRASH_ITEMS.length}`;
  const sec=Math.max(0,session?.timeRemaining??0); const m=String(Math.floor(sec/60)).padStart(2,"0"), s=String(sec%60).padStart(2,"0");
  timerText.textContent=`${m}:${s}`; timerText.style.color=sec<=30?"#d65f50":sec<=60?"#bd8b23":"";
}
function resetGame(){localStorage.removeItem(GAME_KEY);session=null;location.href="challenge1.html"}
function ensureSession(){
  session=load();
  if(!session || session.version!==4 || session.currentChallenge!==CHALLENGE_NO || session.completed[0]){
    if(!session){session=makeDefaultSession();save()}
    else if(session.currentChallenge>CHALLENGE_NO){location.href=`challenge${session.currentChallenge}.html`;return false}
  }
  return true;
}
function showFeedback(icon,title,text,type){
  feedbackIcon.textContent=icon;feedbackTitle.textContent=title;feedbackText.textContent=text;
  feedback.className=`feedback ${type==='correct'?'correct-feedback':'wrong-feedback'}`;
}
function hideFeedback(){feedback.classList.add("hidden")}
function showHint(){
  hintBox.textContent="💡 Coba perhatikan bahan bendanya: dari tumbuhan, plastik, atau kertas.";hintBox.classList.remove("hidden");
  trashItemsEl.querySelectorAll(".trash-item").forEach(el=>el.classList.remove("hint-pulse"));
  window.setTimeout(()=>hintBox.classList.add("hidden"),4500);
}
function resetHintTimer(){
  clearTimeout(hintTimer); hintTimer=setTimeout(()=>{if(session?.status==='playing')showHint()},12000);
}
function startChallenge(){
  if(!session)return;
  if(session.challenge1.order.length!==TRASH_ITEMS.length || session.challenge1.sorted.length>=TRASH_ITEMS.length) session.challenge1={order:shuffle(TRASH_ITEMS.map(x=>x.id)),sorted:[]};
  session.started=true;session.status="playing";session.challengeStarted[0]=true;session.lastUpdatedAt=Date.now();save();
  tutorialScreen.classList.add("hidden");gameArea.classList.remove("hidden");renderTrash();updateHud();resetHintTimer();startGlobalTimer();
}
function renderTrash(){
  trashItemsEl.innerHTML=""; const sorted=new Set(session.challenge1.sorted);
  session.challenge1.order.filter(id=>!sorted.has(id)).forEach(id=>{
    const item=TRASH_ITEMS.find(x=>x.id===id); if(!item)return;
    const el=document.createElement("button");el.type="button";el.className="trash-item";el.dataset.id=item.id;
    el.innerHTML=`<span class="trash-icon">${item.icon}</span><span class="trash-name">${item.name}</span>`;
    el.addEventListener("click",()=>selectTrash(el,item));
    el.addEventListener("pointerdown",e=>beginDrag(e,el,item));
    trashItemsEl.appendChild(el);
  });
}
function selectTrash(el,item){
  if(session.status!=="playing")return;
  selectedId=selectedId===item.id?null:item.id;
  trashItemsEl.querySelectorAll(".trash-item").forEach(x=>x.classList.remove("selected"));
  if(selectedId===item.id)el.classList.add("selected");
  resetHintTimer();
}
function chooseBin(category){
  if(session?.status!=="playing" || !selectedId)return;
  const el=trashItemsEl.querySelector(`.trash-item[data-id="${selectedId}"]`);
  const item=TRASH_ITEMS.find(x=>x.id===selectedId);
  if(!el||!item)return;
  clearTimeout(hintTimer);
  handleSort(el,item,category);
}
function beginDrag(e,el,item){
  if(session.status!=="playing")return;
  if(e.pointerType==="mouse"&&e.button!==0)return;
  const r=el.getBoundingClientRect();drag={el,item,offsetX:e.clientX-r.left,offsetY:e.clientY-r.top,pointerId:e.pointerId};
  el.classList.add("dragging");el.style.left=`${r.left}px`;el.style.top=`${r.top}px`;el.style.width=`${r.width}px`;
  window.addEventListener("pointermove",moveDrag);window.addEventListener("pointerup",endDrag,{once:true});window.addEventListener("pointercancel",cancelDrag,{once:true});
  e.preventDefault();
}
function moveDrag(e){if(!drag||e.pointerId!==drag.pointerId)return;drag.el.style.left=`${e.clientX-drag.offsetX}px`;drag.el.style.top=`${e.clientY-drag.offsetY}px`}
function cancelDrag(){if(drag){resetDrag(drag.el)}drag=null;window.removeEventListener("pointermove",moveDrag)}
function resetDrag(el){el.classList.remove("dragging","selected");el.style.removeProperty("left");el.style.removeProperty("top");el.style.removeProperty("width");}
function endDrag(e){
  if(!drag)return;window.removeEventListener("pointermove",moveDrag);
  const current=drag;drag=null;resetHintTimer();
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(".trash-bin");
  const item=current.item;
  if(target){handleSort(current.el,item,target.dataset.category)}
  else{resetDrag(current.el)}
}
function handleSort(el,item,category){
  selectedId=null;session.totalWrong += category===item.category?0:1;
  if(category===item.category){
    session.totalCorrect++;session.score+=5;save();el.classList.add("correct");
    showFeedback("🎉","Benar!",item.explanation,"correct");speechBubble.textContent="Hebat! Satu lagi berhasil! 🌱";clearTimeout(hintTimer);hintBox.classList.add("hidden");
    setTimeout(()=>{session.challenge1.sorted.push(item.id);save();hideFeedback();renderTrash();updateHud();
      if(session.challenge1.sorted.length>=TRASH_ITEMS.length) completeChallenge(); else resetHintTimer();
    },850);
  }else{
    el.classList.add("wrong");save();showFeedback("💡","Belum tepat",item.explanation,"wrong");speechBubble.textContent="Tidak apa-apa, coba lagi ya! 😊";
    setTimeout(()=>{el.classList.remove("wrong");resetDrag(el);hideFeedback();resetHintTimer()},1200);
  }
}

document.querySelectorAll(".trash-bin").forEach(bin=>{
  bin.addEventListener("click",()=>chooseBin(bin.dataset.category));
});

function completeChallenge(){
  clearTimeout(hintTimer);session.completed[0]=true;session.score+=100;session.currentChallenge=2;session.challengeStarted[1]=false;session.status="instruction";session.lastUpdatedAt=Date.now();save();
  tutorialScreen.classList.add("hidden");gameArea.classList.add("hidden");speechBubble.textContent="Mantap! Kita lanjut ke quiz! 🌿";
  setTimeout(()=>location.href=nextPage,900);
}
function showTimeout(){clearTimeout(hintTimer);clearInterval(timerHandle);gameArea.classList.add("hidden");tutorialScreen.classList.add("hidden");timeoutScreen.classList.remove("hidden");}
function checkStartup(){
  if(!ensureSession())return;
  if(session.status==="timeup"||session.timeRemaining<=0){session.status="timeup";save();showTimeout();return}
  syncTime();
  if(session.status==="timeup") return;
  updateHud();
  if(session.challengeStarted[0]){session.status="playing";tutorialScreen.classList.add("hidden");gameArea.classList.remove("hidden");renderTrash();startGlobalTimer();resetHintTimer()}
  else {tutorialScreen.classList.remove("hidden");gameArea.classList.add("hidden");clearInterval(timerHandle);}
}

$("startChallengeBtn").addEventListener("click",startChallenge);
$("hintBtn").addEventListener("click",()=>{if(session?.status==='playing'){showHint();resetHintTimer()}});
document.querySelectorAll(".trash-bin").forEach(bin=>bin.addEventListener("click",()=>{
  if(session?.status!=="playing"||!selectedId)return;
  const el=trashItemsEl.querySelector(`[data-id="${selectedId}"]`);const item=TRASH_ITEMS.find(x=>x.id===selectedId);if(el&&item)handleSort(el,item,bin.dataset.category);
}));
document.querySelector("[data-restart]").addEventListener("click",resetGame);
window.addEventListener("pageshow",()=>{try{session=load();if(session)updateHud?.()}catch{}});
window.addEventListener("pagehide",()=>{try{if(session){syncTime?.();save?.()}}catch{}});
window.addEventListener("beforeunload",()=>{if(session){syncTime();save()}});
checkStartup();
