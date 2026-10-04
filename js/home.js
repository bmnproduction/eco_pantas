const { loadSession, startNewGame, resetSession, getChallengeStats } = window.GameCore;
const creatorBtn = document.getElementById('creatorBtn');
const creatorClose = document.getElementById('creatorClose');
const creatorModal = document.getElementById('creatorModal');
const startBtn = document.getElementById('startBtn');
const continueBtn = document.getElementById('continueBtn');
const resetBtn = document.getElementById('resetBtn');
const sessionSummary = document.getElementById('sessionSummary');

function openCreator(){creatorModal.classList.remove('hidden')}
function closeCreator(){creatorModal.classList.add('hidden')}
creatorBtn.addEventListener('click',openCreator);creatorClose.addEventListener('click',closeCreator);creatorModal.addEventListener('click',e=>{if(e.target===creatorModal)closeCreator()});

document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCreator()});

const session = loadSession();
if(session && session.started && session.status !== 'completed' && session.status !== 'timeup'){
  startBtn.classList.add('hidden');
  continueBtn.classList.remove('hidden');
  resetBtn.classList.remove('hidden');
  const challenge = session.currentChallenge || session.highestUnlocked || 1;
  const stats = [1,2,3,4].map(no=>getChallengeStats(session,no));
  const done = stats.reduce((sum,s)=>sum+s.done,0);
  const skipped = stats.reduce((sum,s)=>sum+s.skipped,0);
  sessionSummary.textContent = `Sesi tersimpan · Challenge ${challenge}/4 · ${done} selesai · ${skipped} dilewati · sisa waktu ${window.GameCore.formatTime(session.timeRemaining)}`;
}else if(session && session.status==='completed'){
  startBtn.textContent='🔄 Main Lagi';
  resetBtn.classList.remove('hidden');
}else if(session && session.status==='timeup'){
  startBtn.textContent='🔄 Mulai Ulang';
  resetBtn.classList.remove('hidden');
}

startBtn.addEventListener('click',()=>{
  if(session && (session.status==='completed'||session.status==='timeup')) resetSession();
  else startNewGame();
});
continueBtn.addEventListener('click',()=>{
  const current=loadSession();
  if(!current) return startNewGame();
  location.href=`challenge${current.currentChallenge||1}.html`;
});
resetBtn.addEventListener('click',()=>{
  if(confirm('Mulai permainan baru? Progres permainan lama akan dihapus.')) resetSession();
});
