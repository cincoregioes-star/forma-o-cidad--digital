(() => {
  'use strict';

  const cfg=window.APP_CONFIG;
  const $=(s)=>document.querySelector(s);
  const $$=(s)=>[...document.querySelectorAll(s)];
  const state={supabase:null,student:null,levelKey:'fundamental2',lessonIndex:0,attemptId:null,questions:[],answers:{},questionIndex:0};

  function configuredForSupabase(){return !cfg.demoMode&&cfg.supabase.url.startsWith('https://')&&cfg.supabase.publishableKey.length>20}
  function initSupabase(){
    if(!configuredForSupabase())return;
    if(!window.supabase?.createClient)return;
    state.supabase=window.supabase.createClient(cfg.supabase.url,cfg.supabase.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  }
  function showToast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.remove('show'),2500)}
  function setMessage(el,message,kind=''){el.textContent=message;el.className=`form-message ${kind}`.trim()}
  function showScreen(name){$$('.student-screen').forEach(s=>s.classList.remove('active'));$(`#screen-${name}`)?.classList.add('active');window.scrollTo({top:0,behavior:'smooth'})}
  function initials(name=''){return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'FC'}

  async function ensureAnonymousSession(){
    if(!state.supabase)return null;
    const {data}=await state.supabase.auth.getSession();
    if(data?.session?.user?.is_anonymous)return data.session;
    if(data?.session?.user&&!data.session.user.is_anonymous)await state.supabase.auth.signOut();
    const {data:signed,error}=await state.supabase.auth.signInAnonymously();if(error)throw error;return signed.session;
  }

  async function validateCode(){
    const code=$('#studentCode').value.trim().toUpperCase();const msg=$('#codeMessage');
    if(!code)return setMessage(msg,'Digite o código recebido da escola.','error');
    $('#validateCodeBtn').disabled=true;setMessage(msg,'Validando código...');
    try{
      let student;
      if(cfg.demoMode){await new Promise(r=>setTimeout(r,280));student=window.DEMO_STUDENTS[code];if(!student)throw new Error('Código não localizado. Confira e tente novamente.');}
      else{await ensureAnonymousSession();const {data,error}=await state.supabase.functions.invoke(cfg.functions.redeemCode,{body:{code}});if(error)throw error;if(!data?.student)throw new Error(data?.message||'Código inválido ou já utilizado.');student=data.student;}
      state.student=student;state.levelKey=student.levelKey||(String(student.level).includes('Médio')?'medio':'fundamental2');state.lessonIndex=0;
      $('#confirmName').textContent=student.name;$('#confirmSchool').textContent=student.school;$('#confirmGrade').textContent=student.grade;$('#confirmClass').textContent=student.className;$('#confirmLevel').textContent=student.level;$('#identityInitials').textContent=initials(student.name);$('#confirmCheck').checked=false;$('#continueStudentBtn').disabled=true;$('#studentHeaderStatus').textContent=student.grade;
      setMessage(msg,'','success');showScreen('confirm');
    }catch(err){setMessage(msg,err.message||'Não foi possível validar o código.','error')}
    finally{$('#validateCodeBtn').disabled=false}
  }

  function renderLesson(){
    const list=window.LESSON_CONTENT[state.levelKey];const item=list[state.lessonIndex];const total=list.length;const pct=Math.round(((state.lessonIndex+1)/total)*100);
    $('#lessonCounter').textContent=`Trecho ${state.lessonIndex+1} de ${total}`;$('#lessonProgressBar').style.width=`${pct}%`;
    const duality=item.word.includes('INATO')&&item.word.includes('ADQUIRIDO');
    const conceptHtml=duality?`
      <div class="concept-card">
        <span class="concept-kicker">CONCEITO-CHAVE</span>
        <h3>Inato e adquirido</h3>
        <div class="duality-grid">
          <div class="duality-item"><span>PONTO DE PARTIDA</span><strong>Inato</strong><p>Características ou predisposições presentes desde o nascimento.</p></div>
          <div class="duality-item"><span>CONSTRUÇÃO</span><strong>Adquirido</strong><p>Conhecimentos, hábitos e habilidades desenvolvidos pela experiência e aprendizagem.</p></div>
        </div>
        <span class="concept-phrase">${item.phrase}</span>
      </div>`:`
      <div class="concept-card"><span class="concept-kicker">PALAVRA PARA LEVAR</span><h3>${item.word}</h3><p>${item.definition}</p><span class="concept-phrase">${item.phrase}</span></div>`;
    $('#lessonContent').innerHTML=`
      <span class="lesson-index">TRECHO ${String(state.lessonIndex+1).padStart(2,'0')}</span>
      <h2>${item.title}</h2>
      <p class="lesson-lead">${item.lead}</p>
      ${conceptHtml}
      <div class="quote-card"><blockquote>${item.quote}</blockquote><cite>${item.author}</cite></div>
      <div class="reflection-card"><span>PARA PENSAR</span><strong>${item.question}</strong></div>`;
    $('#prevLessonBtn').disabled=state.lessonIndex===0;
    $('#nextLessonBtn').classList.toggle('hidden',state.lessonIndex===total-1);
    $('#startQuizBtn').classList.toggle('hidden',state.lessonIndex!==total-1);
  }

  function sample(array,count){return[...array].sort(()=>Math.random()-.5).slice(0,count)}
  function buildDemoQuiz(){
    const pool=window.DEMO_QUESTIONS.filter(q=>q.level===state.levelKey);
    return[
      ...sample(pool.filter(q=>q.type==='Conceito'),cfg.quiz.conceptCount),
      ...sample(pool.filter(q=>q.type==='Aplicação'),cfg.quiz.applicationCount),
      ...sample(pool.filter(q=>q.type==='Situação-problema'),cfg.quiz.scenarioCount)
    ].sort(()=>Math.random()-.5).map(({correct,...publicQ})=>({...publicQ,_correct:correct}));
  }

  async function startDiagnostic(){
    if(!state.student)return showScreen('access');
    try{
      if(cfg.demoMode){state.attemptId=`demo-${Date.now()}`;state.questions=buildDemoQuiz();}
      else{const {data,error}=await state.supabase.functions.invoke(cfg.functions.startDiagnostic,{body:{}});if(error)throw error;state.attemptId=data.attemptId;state.questions=data.questions;}
      state.answers={};state.questionIndex=0;showScreen('quiz');renderQuestion();
    }catch(err){showToast(err.message||'Não foi possível iniciar o diagnóstico.')}
  }

  function renderQuestion(){
    const q=state.questions[state.questionIndex];if(!q)return;const total=state.questions.length;const pct=Math.round(((state.questionIndex+1)/total)*100);const selected=state.answers[q.id];
    $('#quizTitle').textContent=`Questão ${state.questionIndex+1} de ${total}`;$('#quizProgressText').textContent=`${pct}%`;$('#quizProgressBar').style.width=`${pct}%`;
    $('#quizQuestion').innerHTML=`<span class="question-meta">${q.type} • ${q.topic}</span><h3>${q.prompt}</h3><div class="answers">${q.options.map((opt,i)=>`<label class="answer-option ${selected===i?'selected':''}"><input type="radio" name="answer" value="${i}" ${selected===i?'checked':''}><span><b>${String.fromCharCode(65+i)})</b> ${opt}</span></label>`).join('')}</div>`;
    $$('#quizQuestion input[name="answer"]').forEach(input=>input.addEventListener('change',()=>{state.answers[q.id]=Number(input.value);renderQuestion()}));
    $('#prevQuestionBtn').disabled=state.questionIndex===0;$('#nextQuestionBtn').classList.toggle('hidden',state.questionIndex===total-1);$('#finishQuizBtn').classList.toggle('hidden',state.questionIndex!==total-1);
  }

  async function finishDiagnostic(){
    const missing=state.questions.filter(q=>state.answers[q.id]===undefined);if(missing.length)return showToast(`Ainda faltam ${missing.length} questão(ões).`);
    $('#finishQuizBtn').disabled=true;
    try{
      if(!cfg.demoMode){const payload={attemptId:state.attemptId,answers:Object.entries(state.answers).map(([questionId,answerIndex])=>({questionId,answerIndex}))};try{const {error}=await state.supabase.functions.invoke(cfg.functions.submitDiagnostic,{body:payload});if(error)throw error;}catch(networkErr){localStorage.setItem('fcd_pending_submission',JSON.stringify(payload));throw new Error('Sem conexão. As respostas ficaram salvas neste aparelho e serão reenviadas quando a internet voltar.');}}
      showScreen('result');$('#studentHeaderStatus').textContent='Concluído';
    }catch(err){showToast(err.message||'Erro ao enviar respostas.')}
    finally{$('#finishQuizBtn').disabled=false}
  }

  async function retryPending(){
    if(cfg.demoMode||!state.supabase)return;const raw=localStorage.getItem('fcd_pending_submission');if(!raw)return;
    try{const payload=JSON.parse(raw);const {error}=await state.supabase.functions.invoke(cfg.functions.submitDiagnostic,{body:payload});if(!error){localStorage.removeItem('fcd_pending_submission');showToast('Respostas pendentes enviadas com sucesso.')}}catch(_){ }
  }

  function bind(){
    $('#validateCodeBtn').addEventListener('click',validateCode);$('#studentCode').addEventListener('keydown',e=>{if(e.key==='Enter')validateCode()});
    $('#confirmCheck').addEventListener('change',e=>$('#continueStudentBtn').disabled=!e.target.checked);
    $('#continueStudentBtn').addEventListener('click',()=>{state.lessonIndex=0;renderLesson();showScreen('lesson')});
    $('#exitLessonBtn').addEventListener('click',()=>showScreen('confirm'));
    $('#prevLessonBtn').addEventListener('click',()=>{if(state.lessonIndex>0){state.lessonIndex--;renderLesson();window.scrollTo({top:0,behavior:'smooth'})}});
    $('#nextLessonBtn').addEventListener('click',()=>{const max=window.LESSON_CONTENT[state.levelKey].length-1;if(state.lessonIndex<max){state.lessonIndex++;renderLesson();window.scrollTo({top:0,behavior:'smooth'})}});
    $('#startQuizBtn').addEventListener('click',startDiagnostic);
    $('#prevQuestionBtn').addEventListener('click',()=>{if(state.questionIndex>0){state.questionIndex--;renderQuestion()}});
    $('#nextQuestionBtn').addEventListener('click',()=>{const q=state.questions[state.questionIndex];if(state.answers[q.id]===undefined)return showToast('Marque uma alternativa antes de avançar.');if(state.questionIndex<state.questions.length-1){state.questionIndex++;renderQuestion()}});
    $('#finishQuizBtn').addEventListener('click',finishDiagnostic);window.addEventListener('online',retryPending);
  }
  function registerServiceWorker(){if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{})}
  function init(){initSupabase();bind();registerServiceWorker();retryPending()}
  window.addEventListener('load',init);
})();
