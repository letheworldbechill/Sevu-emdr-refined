document.addEventListener('DOMContentLoaded',()=>{

/* ---- Splash Fade ---- */
const splash=document.getElementById('splash');
setTimeout(()=>{splash.classList.add('fade');},1600);
setTimeout(()=>{splash.remove();},2600);

/* ---- DOM Refs ---- */
const stage=document.getElementById('stage'),dotWrap=document.getElementById('dotWrapper'),dot=document.getElementById('dot');
const startStop=document.getElementById('startStop'),menuBtn=document.getElementById('menuBtn'),menu=document.getElementById('menu');
const speedRange=document.getElementById('speedRange'),speedLabel=document.getElementById('speedLabel');
const durationSelect=document.getElementById('durationSelect');
const setsInput=document.getElementById('setsInput');
const pauseInput=document.getElementById('pauseInput');
const timerDisplay=document.getElementById('timer');
const heartbeatEl=document.getElementById('heartbeat');
const themeSelect=document.getElementById('themeSelect');
const darkToggle=document.getElementById('darkToggle');
const evalModal=document.getElementById('evalModal');
const continueBtn=document.getElementById('continueBtn');

/* ---- State ---- */
let running=false,direction=1,pos=0,lastTimestamp=null,beatTimer=null,animFrame=null,timerInterval=null;
let speedBPM=60,durationSec=45,remainingSec=45,totalSets=8,currentSet=1,pauseSec=8;
let waitingForEval=false;

/* ---- PERSIST ---- */
const savePrefs=()=>{localStorage.setItem('emdrPrefs',JSON.stringify({speedBPM,durationSec,totalSets,pauseSec,theme:themeSelect.value,dark:darkToggle.checked}));};
const loadPrefs=()=>{const p=JSON.parse(localStorage.getItem('emdrPrefs')||'null');if(!p)return;
speedBPM=p.speedBPM||speedBPM;durationSec=p.durationSec||durationSec;totalSets=p.totalSets||totalSets;pauseSec=p.pauseSec||pauseSec;
themeSelect.value=p.theme||'standard';darkToggle.checked=!!p.dark;
};
loadPrefs();

/* ---- UI Init ---- */
speedRange.value=speedBPM;speedLabel.textContent=speedBPM;
durationSelect.value=durationSec;setsInput.value=totalSets;pauseInput.value=pauseSec;
applyTheme(themeSelect.value);applyDarkMode();

/* ---- Audio Stereo Panner & Context ---- */
const AudioCtx=window.AudioContext||window.webkitAudioContext;
const audioCtx=new AudioCtx();
const src=audioCtx.createMediaElementSource(heartbeatEl);
const panner=audioCtx.createStereoPanner();
src.connect(panner).connect(audioCtx.destination);

/* ---- Helpers ---- */
const formatTime=s=>('0'+Math.floor(s)).slice(-2);
const updateTimerDisplay=()=>{timerDisplay.textContent=`${formatTime(remainingSec)} s`;};
const updateDotPos=()=>{const stageW=stage.clientWidth,dotW=dot.clientWidth,offset=20,travel=stageW-dotW-offset*2;
const x=offset+pos*travel;dotWrap.style.transform=`translate(${x}px,-50%)`;};

/* ---- Audio & Haptic ---- */
const playBeat=()=>{heartbeatEl.currentTime=0;heartbeatEl.play().catch(()=>{}); try{if(navigator.vibrate)navigator.vibrate(60);}catch(e){} panner.pan.value=direction;};
const startBeats=()=>{stopBeats();playBeat();const interval=60000/speedBPM;beatTimer=setInterval(playBeat,interval);};
const stopBeats=()=>{if(beatTimer){clearInterval(beatTimer);beatTimer=null;}heartbeatEl.pause();heartbeatEl.currentTime=0;};

/* ---- Timer & Sequencer ---- */
const startTimer=()=>{remainingSec=durationSec;updateTimerDisplay();timerInterval=setInterval(()=>{remainingSec--;updateTimerDisplay();
if(remainingSec<=0){handleSetEnd();}},1000);};
const stopTimer=()=>{if(timerInterval){clearInterval(timerInterval);timerInterval=null;}};

const handleSetEnd=()=>{stopBeats();stopTimer();if(currentSet>=totalSets){stop();return;}
waitingForEval=true;showEval();};

const showEval=()=>{evalModal.classList.remove('hidden');};
const hideEval=()=>{evalModal.classList.add('hidden');waitingForEval=false;currentSet++;setTimeout(()=>startPause(),100);};

const startPause=()=>{remainingSec=pauseSec;updateTimerDisplay();timerInterval=setInterval(()=>{remainingSec--;updateTimerDisplay();
if(remainingSec<=0){stopTimer();startSet();}},1000);};

const startSet=()=>{startBeats();startTimer();};

continueBtn.addEventListener('click',()=>{hideEval();if(running)startSet();});

/* ---- Main Control ---- */
const start=()=>{if(audioCtx.state==='suspended'){audioCtx.resume();}
running=true;startStop.textContent='Stop';currentSet=1;pos=0;direction=1;savePrefs();startSet();animFrame=requestAnimationFrame(step);};
const stop=()=>{running=false;startStop.textContent='Start';stopBeats();stopTimer();if(animFrame)cancelAnimationFrame(animFrame);};

startStop.addEventListener('click',()=>running?stop():start());

/* ---- Animation Loop ---- */
const step=timestamp=>{if(!running)return;if(!lastTimestamp)lastTimestamp=timestamp;
const dt=(timestamp-lastTimestamp)/1000;lastTimestamp=timestamp;
const bps=speedBPM/60,cycleTime=2/bps,distPerSec=2/cycleTime;
pos+=direction*distPerSec*dt;if(pos>=1){pos=1;direction=-1;}else if(pos<=0){pos=0;direction=1;}
updateDotPos();animFrame=requestAnimationFrame(step);};

/* ---- Menu & Inputs ---- */
menuBtn.addEventListener('click',()=>{menu.classList.toggle('hidden');menu.setAttribute('aria-hidden',menu.classList.contains('hidden'));});
document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!menuBtn.contains(e.target)&&!menu.classList.contains('hidden')){menu.classList.add('hidden');menu.setAttribute('aria-hidden','true');}});
speedRange.addEventListener('input',()=>{speedBPM=parseInt(speedRange.value,10);speedLabel.textContent=speedBPM;savePrefs();if(running&&!waitingForEval)startBeats();});
durationSelect.addEventListener('change',()=>{durationSec=parseInt(durationSelect.value,10);savePrefs();});
setsInput.addEventListener('change',()=>{totalSets=parseInt(setsInput.value,10);savePrefs();});
pauseInput.addEventListener('change',()=>{pauseSec=parseInt(pauseInput.value,10);savePrefs();});
themeSelect.addEventListener('change',()=>{applyTheme(themeSelect.value);savePrefs();});
darkToggle.addEventListener('change',()=>{applyDarkMode();savePrefs();});

/* ---- Theme & Dark Mode ---- */
function applyTheme(theme){const root=document.documentElement;
switch(theme){
case'sunset':root.style.setProperty('--grad-start','#ff9d73');root.style.setProperty('--grad-end','#ff4e50');break;
case'mint':root.style.setProperty('--grad-start','#b6fcb6');root.style.setProperty('--grad-end','#2abf88');break;
default:root.style.setProperty('--grad-start','#5ab2ff');root.style.setProperty('--grad-end','#0044aa');
}}
function applyDarkMode(){document.body.classList.toggle('dark',darkToggle.checked);}

/* ---- Resize ---- */
window.addEventListener('resize',updateDotPos);updateDotPos();updateTimerDisplay();

});
