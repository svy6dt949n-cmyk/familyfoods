import { useState, useCallback, useEffect } from "react";

const SUPA_URL = "https://oamiquozbzmtexfceeej.supabase.co";
const SUPA_KEY = "sb_publishable_5Rd1aC7uv8nmzM5WaJCRuw_QSRhqjK8";

async function sbFetch(path, options={}) {
  const res = await fetch(`${SUPA_URL}/rest/v1${path}`, {
    headers: {
      "apikey": SUPA_KEY,
      "Authorization": `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

const db = {
  getEmployees: () => sbFetch("/employees?order=id"),
  addEmployee: (emp) => sbFetch("/employees", { method:"POST", body: JSON.stringify(emp) }),
  updateEmployee: (id, data) => sbFetch(`/employees?id=eq.${id}`, { method:"PATCH", body: JSON.stringify(data) }),
  deleteEmployee: (id) => sbFetch(`/employees?id=eq.${id}`, { method:"DELETE" }),
  getRequests: () => sbFetch("/requests?order=created_at.desc"),
  addRequest: (req) => sbFetch("/requests", { method:"POST", body: JSON.stringify(req) }),
  updateRequest: (id, data) => sbFetch(`/requests?id=eq.${id}`, { method:"PATCH", body: JSON.stringify(data) }),
  deleteRequest: (id) => sbFetch(`/requests?id=eq.${id}`, { method:"DELETE" }),
};

const JP_HOLIDAYS = {
  "2025-01-01":"元日","2025-01-13":"成人の日","2025-02-11":"建国記念の日",
  "2025-02-23":"天皇誕生日","2025-03-20":"春分の日","2025-04-29":"昭和の日",
  "2025-05-03":"憲法記念日","2025-05-04":"みどりの日","2025-05-05":"こどもの日",
  "2025-07-21":"海の日","2025-08-11":"山の日","2025-09-15":"敬老の日",
  "2025-09-23":"秋分の日","2025-10-13":"スポーツの日","2025-11-03":"文化の日",
  "2025-11-23":"勤労感謝の日","2026-01-01":"元日","2026-01-12":"成人の日",
  "2026-02-11":"建国記念の日","2026-02-23":"天皇誕生日","2026-03-20":"春分の日",
  "2026-04-29":"昭和の日","2026-05-03":"憲法記念日","2026-05-04":"みどりの日",
  "2026-05-05":"こどもの日","2026-07-20":"海の日","2026-08-11":"山の日",
  "2026-09-21":"敬老の日","2026-09-23":"秋分の日","2026-10-12":"スポーツの日",
  "2026-11-03":"文化の日","2026-11-23":"勤労感謝の日",
};

const DAY_LABELS_JP=["日","月","火","水","木","金","土"];
const DAY_LABELS_KO=["일","월","화","수","목","금","토"];
const MONTHS_JP=["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const DAYOFF_NUM={月:1,水:3,土:6};
const DEPT_OPTIONS=["営業","開発","デザイン","総務","経理","人事","その他"];
const LS_LOGIN="ff_login_id";
const LS_LANG="ff_lang";

// 색상 정의
const COLOR = {
  sentaku: { bg:"#d1fae5", text:"#065f46", border:"#6ee7b7", label:"選択休暇", labelKo:"선택휴무" },
  yukyu:   { bg:"#dbeafe", text:"#1e40af", border:"#93c5fd", label:"有給休暇", labelKo:"유급휴가" },
  half:    { bg:"#e0e7ff", text:"#3730a3", border:"#a5b4fc", label:"半休",     labelKo:"반차" },
};

function fmt(y,m,d){return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;}
function getDays(y,m){return new Date(y,m+1,0).getDate();}
function getFirst(y,m){return new Date(y,m,1).getDay();}
function isHoliday(ds){return !!JP_HOLIDAYS[ds];}
function isOff(ds){return new Date(ds).getDay()===0||isHoliday(ds);}
function dayColor(ds){const d=new Date(ds).getDay();return d===0?{color:"#ef4444"}:d===6?{color:"#3b82f6"}:{};}
function makeAvatar(name){return name?name.trim().charAt(0):"?";}

// 연휴 전후 체크 (전날 또는 다음날이 공휴일/일요일인지)
function isNearHoliday(ds){
  const d = new Date(ds);
  const prev = new Date(d); prev.setDate(d.getDate()-1);
  const next = new Date(d); next.setDate(d.getDate()+1);
  const prevStr = prev.toISOString().slice(0,10);
  const nextStr = next.toISOString().slice(0,10);
  return isOff(prevStr) || isOff(nextStr);
}

export default function App(){
  const [lang,setLangState]=useState(()=>{try{return localStorage.getItem(LS_LANG)||"ja";}catch(e){return "ja";}});
  const [employees,setEmployees]=useState([]);
  const [requests,setRequests]=useState([]);
  const [loggedIn,setLoggedIn]=useState(null);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [year,setYear]=useState(2026);
  const [month,setMonth]=useState(5);

  const t=useCallback((ja,ko)=>lang==="ja"?ja:ko,[lang]);
  function setLang(l){setLangState(l);try{localStorage.setItem(LS_LANG,l);}catch(e){}}

  // 데이터 로드 함수 (재사용)
  async function loadData(showLoad=true){
    if(showLoad) setLoading(true);
    try{
      const [emps,reqs]=await Promise.all([db.getEmployees(),db.getRequests()]);
      setEmployees(emps); setRequests(reqs);
      const savedId=localStorage.getItem(LS_LOGIN);
      if(savedId&&!loggedIn){const acc=emps.find(e=>e.login_id===savedId);if(acc)setLoggedIn(acc);}
    }catch(e){showToast("DB接続エラー","error");}
    finally{if(showLoad)setLoading(false);}
  }

  useEffect(()=>{
    loadData(true);
    // 30초마다 자동 새로고침
    const timer=setInterval(()=>loadData(false),30000);
    return ()=>clearInterval(timer);
  },[]);

  function showToast(msg,type="success"){setToast({msg,type});setTimeout(()=>setToast(null),3200);}

  function login(loginId,password){
    const acc=employees.find(a=>a.login_id===loginId&&a.password===password&&a.role!=="pending");
    if(!acc){showToast(t("IDまたはパスワードが違います","ID 또는 비밀번호가 틀립니다"),"error");return;}
    try{localStorage.setItem(LS_LOGIN,acc.login_id);}catch(e){}
    setLoggedIn(acc);
  }
  function logout(){try{localStorage.removeItem(LS_LOGIN);}catch(e){}setLoggedIn(null);}

  async function changePassword(userId,newPassword){
    try{
      await db.updateEmployee(userId,{password:newPassword,must_change_password:false});
      setEmployees(p=>p.map(e=>e.id===userId?{...e,password:newPassword,must_change_password:false}:e));
      setLoggedIn(prev=>({...prev,password:newPassword,must_change_password:false}));
      showToast(t("パスワードを変更しました","비밀번호 변경 완료"));
    }catch(e){showToast(t("エラーが発生しました","오류 발생"),"error");}
  }

  async function addEmployee(emp){
    if(employees.find(e=>e.login_id===emp.login_id)){
      showToast(t("このIDは既に使われています","이미 사용 중인 ID입니다"),"error");return false;
    }
    try{
      const res=await db.addEmployee({
        login_id:emp.login_id, password:emp.tempPassword||"temp1234",
        must_change_password:true, name:emp.name, name_ko:emp.nameKo||emp.name,
        avatar:makeAvatar(emp.name), dept:emp.dept||"その他", role:"employee",
        remaining_paid_leave:Number(emp.remainingPaidLeave)||20,
        selected_day_off:emp.selectedDayOff||"月",
      });
      setEmployees(p=>[...p,...res]);
      showToast(t("社員を追加しました","직원 추가 완료"));return true;
    }catch(e){showToast(t("エラーが発生しました","오류 발생"),"error");return false;}
  }

  async function updateEmployee(id,data){
    if(data.login_id&&employees.find(e=>e.login_id===data.login_id&&e.id!==id)){
      showToast(t("このIDは既に使われています","이미 사용 중인 ID입니다"),"error");return false;
    }
    try{
      const u={};
      if(data.name){u.name=data.name;u.avatar=makeAvatar(data.name);}
      if(data.nameKo)u.name_ko=data.nameKo;
      if(data.login_id)u.login_id=data.login_id;
      if(data.dept)u.dept=data.dept;
      if(data.selectedDayOff)u.selected_day_off=data.selectedDayOff;
      if(data.remainingPaidLeave!==undefined)u.remaining_paid_leave=Number(data.remainingPaidLeave);
      if(data.password)u.password=data.password;
      await db.updateEmployee(id,u);
      setEmployees(p=>p.map(e=>e.id===id?{...e,...u}:e));
      showToast(t("更新しました","업데이트 완료"));return true;
    }catch(e){showToast(t("エラーが発생しました","오류 발생"),"error");return false;}
  }

  async function deleteEmployee(id){
    try{
      await db.deleteEmployee(id);
      setEmployees(p=>p.filter(e=>e.id!==id));
      setRequests(p=>p.filter(r=>r.emp_id!==id));
      showToast(t("削除しました","삭제 완료"),"warn");
    }catch(e){showToast(t("エラーが発生しました","오류 발생"),"error");}
  }

  async function resetPassword(id,tempPw){
    try{
      await db.updateEmployee(id,{password:tempPw,must_change_password:true});
      setEmployees(p=>p.map(e=>e.id===id?{...e,password:tempPw,must_change_password:true}:e));
      showToast(t(`仮PW「${tempPw}」に設定`,`임시PW「${tempPw}」설정`));
    }catch(e){showToast(t("エラーが発生しました","오류 발생"),"error");}
  }

  async function submitRequest({empId,type,date,note,half}){
    if(!date){showToast(t("日付を選択","날짜 선택"),"error");return;}
    if(isOff(date)){showToast(t("公休日・日曜は申請不可","공휴일·일요일 신청 불가"),"error");return;}
    if(requests.find(r=>r.emp_id===empId&&r.date===date)){showToast(t("既に申請済み","이미 신청함"),"error");return;}
    if(type==="選択休暇"){
      const dow=new Date(date).getDay();
      // 직원은 월(1)/수(3)/토(6)만 신청 가능
      if(![1,3,6].includes(dow)){
        showToast(t("選択休暇は月・水・土のみ申請可能です","선택휴무는 월·수·토만 신청 가능합니다"),"error");return;
      }
    }
    try{
      const res=await db.addRequest({emp_id:empId,type,date,status:"pending",note:note||"",half:!!half});
      setRequests(p=>[...p,...res]);
      showToast(t("申請しました！","신청 완료!"));
    }catch(e){showToast(t("エラーが発生しました","오류 발생"),"error");}
  }

  async function approve(id){
    const req=requests.find(r=>r.id===id);
    try{
      await db.updateRequest(id,{status:"approved"});
      setRequests(p=>p.map(r=>r.id===id?{...r,status:"approved"}:r));
      if(req.type==="有給休暇"&&!req.half){
        const emp=employees.find(e=>e.id===req.emp_id);
        const newLeave=Math.max(0,(emp?.remaining_paid_leave||0)-1);
        await db.updateEmployee(req.emp_id,{remaining_paid_leave:newLeave});
        setEmployees(p=>p.map(e=>e.id===req.emp_id?{...e,remaining_paid_leave:newLeave}:e));
      } else if(req.type==="有給休暇"&&req.half){
        const emp=employees.find(e=>e.id===req.emp_id);
        const newLeave=Math.max(0,(emp?.remaining_paid_leave||0)-0.5);
        await db.updateEmployee(req.emp_id,{remaining_paid_leave:newLeave});
        setEmployees(p=>p.map(e=>e.id===req.emp_id?{...e,remaining_paid_leave:newLeave}:e));
      }
      showToast(t("承認しました","승인 완료"));
    }catch(e){showToast(t("エラーが発生しました","오류 발생"),"error");}
  }

  async function reject(id){
    try{
      await db.updateRequest(id,{status:"rejected"});
      setRequests(p=>p.map(r=>r.id===id?{...r,status:"rejected"}:r));
      showToast(t("却下しました","반려 완료"),"warn");
    }catch(e){showToast(t("エラーが発생しました","오류 발생"),"error");}
  }

  async function cancel(id){
    const r=requests.find(x=>x.id===id);
    try{
      await db.deleteRequest(id);
      setRequests(p=>p.filter(x=>x.id!==id));
      if(r?.status==="approved"&&r.type==="有給休暇"){
        const emp=employees.find(e=>e.id===r.emp_id);
        const newLeave=(emp?.remaining_paid_leave||0)+(r.half?0.5:1);
        await db.updateEmployee(r.emp_id,{remaining_paid_leave:newLeave});
        setEmployees(p=>p.map(e=>e.id===r.emp_id?{...e,remaining_paid_leave:newLeave}:e));
      }
      showToast(t("キャンセルしました","취소 완료"));
    }catch(e){showToast(t("エラーが発生しました","오류 발생"),"error");}
  }

  function downloadCSV(){
    const rows=[["ID","氏名","種別","日付","半休","ステータス","備考"],
      ...requests.map(r=>{const e=employees.find(a=>a.id===r.emp_id);
        return[r.id,e?.name||"",r.type,r.date,r.half?"○":"",r.status,r.note];})];
    const csv=rows.map(r=>r.join(",")).join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`schedule_${year}_${month+1}.csv`;a.click();
  }

  // 인원 부족 경고: 전체 인원의 1/3 이상 + 연휴 전후 집중
  function getWarnings(){
    const w=[];
    const empCount=employees.filter(e=>e.role==="employee").length;
    if(empCount===0) return w;
    for(let d=1;d<=getDays(year,month);d++){
      const ds=fmt(year,month,d);
      if(isOff(ds)) continue;
      const absent=requests.filter(r=>r.date===ds&&r.status==="approved").length;
      const threshold=Math.ceil(empCount/3);
      // 1/3 이상 또는 연휴 전후에 2명 이상
      if(absent>=threshold||(isNearHoliday(ds)&&absent>=2)) w.push(ds);
    }
    return w;
  }

  function prevMonth(){if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1);}
  function nextMonth(){if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1);}

  const warn=getWarnings();
  const pendingList=requests.filter(r=>r.status==="pending");
  const dayLabels=lang==="ja"?DAY_LABELS_JP:DAY_LABELS_KO;
  const getApproved=(ds)=>requests.filter(r=>r.date===ds&&r.status==="approved");
  const getAllForDate=(ds)=>requests.filter(r=>r.date===ds);
  const getMyReq=(empId,ds)=>requests.find(r=>r.emp_id===empId&&r.date===ds);
  const currentEmp=loggedIn?.role==="employee"?(employees.find(e=>e.id===loggedIn.id)||loggedIn):loggedIn;

  const shared={lang,t,employees,requests,showToast,submitRequest,approve,reject,cancel,downloadCSV,
    warn,pendingList,year,month,prevMonth,nextMonth,daysInMonth:getDays(year,month),
    firstDay:getFirst(year,month),dayLabels,getApproved,getAllForDate,getMyReq};

  if(loading) return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
      <SmileLogo size={70}/>
      <div style={{color:"#fff",fontSize:22,fontWeight:900,marginTop:12}}>
        <span style={{color:"#fca5a5"}}>Family</span><span style={{color:"#bbf7d0"}}>Foods</span>
      </div>
      <div style={{color:"rgba(255,255,255,0.7)",fontSize:13,marginTop:8}}>{t("読み込み中…","로딩 중…")}</div>
      <div style={{width:40,height:40,border:"4px solid rgba(255,255,255,0.3)",
        borderTop:"4px solid #fff",borderRadius:"50%",animation:"spin 1s linear infinite",marginTop:20}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={S.root}>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
      {!loggedIn&&<LoginScreen lang={lang} setLang={setLang} t={t} onLogin={login}/>}
      {loggedIn&&currentEmp?.must_change_password&&(
        <ForceChangePw lang={lang} t={t} user={currentEmp}
          onSave={(pw)=>changePassword(currentEmp.id,pw)} onLogout={logout}/>
      )}
      {loggedIn&&!currentEmp?.must_change_password&&(
        <>
          <Header lang={lang} setLang={setLang} t={t} user={currentEmp} onLogout={logout}/>
          <main style={S.main}>
            {loggedIn.role==="admin"
              ? <AdminView {...shared} allAccounts={employees}
                  addEmployee={addEmployee} updateEmployee={updateEmployee}
                  deleteEmployee={deleteEmployee} resetPassword={resetPassword}/>
              : <EmployeeView {...shared} currentUser={currentEmp}
                  onChangePassword={(pw)=>changePassword(currentEmp.id,pw)}/>
            }
          </main>
        </>
      )}
    </div>
  );
}

// ── 공통 로고 ─────────────────────────────────────────────────────
function SmileLogo({size=52}){
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" stroke="#333" strokeWidth="3" fill="white"/>
      <path d="M20 24 Q23 21 26 24" stroke="#333" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <ellipse cx="42" cy="23" rx="3" ry="4" fill="#333"/>
      <path d="M20 38 Q32 50 44 38" stroke="#333" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
function FamilyFoodsText({size=22}){
  return (
    <div style={{display:"flex",alignItems:"baseline",lineHeight:1}}>
      <span style={{fontSize:size,fontWeight:900,color:"#e03a2f",fontFamily:"'Arial Rounded MT Bold',sans-serif"}}>Family</span>
      <span style={{fontSize:size,fontWeight:900,color:"#6ab04c",fontFamily:"'Arial Rounded MT Bold',sans-serif"}}>Foods</span>
    </div>
  );
}

// ── 캘린더 칩 색상 헬퍼 ──────────────────────────────────────────
function getChipStyle(req){
  if(req.status==="pending") return {bg:"#fef3c7",text:"#92400e"};
  if(req.status==="rejected") return {bg:"#fee2e2",text:"#991b1b"};
  if(req.type==="選択休暇") return {bg:COLOR.sentaku.bg,text:COLOR.sentaku.text};
  if(req.half) return {bg:COLOR.half.bg,text:COLOR.half.text};
  return {bg:COLOR.yukyu.bg,text:COLOR.yukyu.text};
}

// ══════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════
function LoginScreen({lang,setLang,t,onLogin}){
  const [id,setId]=useState("");const [pw,setPw]=useState("");const [show,setShow]=useState(false);
  return (
    <div style={S.loginBg}>
      <div style={S.loginCard}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}><LangToggle lang={lang} setLang={setLang}/></div>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><SmileLogo size={64}/></div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:6}}><FamilyFoodsText size={24}/></div>
          <div style={S.loginSub}>{t("勤怠管理システム","근태관리 시스템")}</div>
        </div>
        <div style={S.fg}>
          <label style={S.fl}>{t("ログインID","로그인 ID")}</label>
          <input style={S.input} value={id} onChange={e=>setId(e.target.value)}
            placeholder={t("IDを入力","ID 입력")} autoComplete="username"/>
        </div>
        <div style={S.fg}>
          <label style={S.fl}>{t("パスワード","비밀번호")}</label>
          <div style={{position:"relative"}}>
            <input style={{...S.input,paddingRight:40}} value={pw} onChange={e=>setPw(e.target.value)}
              type={show?"text":"password"} placeholder="••••••••"
              onKeyDown={e=>e.key==="Enter"&&onLogin(id,pw)}/>
            <button style={S.eyeBtn} onClick={()=>setShow(v=>!v)}>{show?"🙈":"👁"}</button>
          </div>
        </div>
        <button style={{...S.primaryBtn,width:"100%",marginTop:12}} onClick={()=>onLogin(id,pw)}>
          {t("ログイン","로그인")} →
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// FORCE CHANGE PASSWORD
// ══════════════════════════════════════════════════════════════════
function ForceChangePw({lang,t,user,onSave,onLogout}){
  const [pw,setPw]=useState("");const [pw2,setPw2]=useState("");
  const [show,setShow]=useState(false);const [err,setErr]=useState("");
  function handleSave(){
    if(pw.length<6){setErr(t("6文字以上","6자 이상"));return;}
    if(pw!==pw2){setErr(t("パスワードが一致しません","비밀번호 불일치"));return;}
    setErr("");onSave(pw);
  }
  return (
    <div style={S.loginBg}>
      <div style={S.loginCard}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:40,marginBottom:8}}>🔑</div>
          <div style={{fontSize:18,fontWeight:800}}>{t("パスワードの変更","비밀번호 변경")}</div>
          <div style={{fontSize:13,color:"#6b7280",marginTop:6}}>
            {t("初回ログインです。新しいパスワードを設定してください。","첫 로그인입니다. 새 비밀번호를 설정해주세요.")}
          </div>
        </div>
        <div style={{background:"#f8fafc",borderRadius:10,padding:"12px 16px",marginBottom:20,
          display:"flex",alignItems:"center",gap:10}}>
          <div style={S.smAv}>{user.avatar}</div>
          <div><div style={{fontWeight:700}}>{lang==="ja"?user.name:user.name_ko}</div>
            <div style={{fontSize:12,color:"#9ca3af"}}>ID: {user.login_id}</div></div>
        </div>
        <div style={S.fg}><label style={S.fl}>{t("新しいパスワード","새 비밀번호")}</label>
          <div style={{position:"relative"}}>
            <input style={{...S.input,paddingRight:40}} value={pw} type={show?"text":"password"}
              onChange={e=>{setPw(e.target.value);setErr("");}}/>
            <button style={S.eyeBtn} onClick={()=>setShow(v=>!v)}>{show?"🙈":"👁"}</button>
          </div>
        </div>
        <div style={S.fg}><label style={S.fl}>{t("パスワード確認","비밀번호 확인")}</label>
          <input style={S.input} value={pw2} type="password"
            onChange={e=>{setPw2(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&handleSave()}/>
        </div>
        {pw.length>0&&(<div style={{marginBottom:12}}>
          <div style={S.bar}><div style={{...S.barFill,
            width:pw.length<6?"30%":pw.length<10?"65%":"100%",
            background:pw.length<6?"#ef4444":pw.length<10?"#f59e0b":"#10b981"}}/></div>
        </div>)}
        {err&&<div style={{color:"#ef4444",fontSize:12,marginBottom:10}}>⚠ {err}</div>}
        <button style={{...S.primaryBtn,width:"100%"}} onClick={handleSave}>{t("設定する","설정하기")} →</button>
        <button style={{...S.closeBtn,width:"100%",marginTop:8,textAlign:"center"}} onClick={onLogout}>{t("ログアウト","로그아웃")}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// HEADER
// ══════════════════════════════════════════════════════════════════
function Header({lang,setLang,t,user,onLogout}){
  return (
    <header style={S.header}>
      <div style={S.logo}>
        <div style={S.logoIcon}><SmileLogo size={28}/></div>
        <div><FamilyFoodsText size={14}/><div style={S.logoSub}>{t("勤怠管理システム","근태관리 시스템")}</div></div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <LangToggle lang={lang} setLang={setLang}/>
        <div style={S.userChip}>
          <span style={S.userAv}>{user.avatar}</span>
          <span style={{fontSize:13,fontWeight:700}}>{lang==="ja"?user.name:user.name_ko}</span>
          <span style={{...S.rolePill,background:user.role==="admin"?"#f3e8ff":"#dbeafe",
            color:user.role==="admin"?"#7e22ce":"#1e40af"}}>
            {user.role==="admin"?t("管理者","관리자"):t("社員","직원")}
          </span>
        </div>
        <button style={S.logoutBtn} onClick={onLogout}>{t("ログアウト","로그아웃")}</button>
      </div>
    </header>
  );
}

// ══════════════════════════════════════════════════════════════════
// EMPLOYEE VIEW
// ══════════════════════════════════════════════════════════════════
function EmployeeView({lang,t,currentUser,requests,year,month,prevMonth,nextMonth,
  daysInMonth,firstDay,dayLabels,warn,getApproved,getMyReq,submitRequest,cancel,onChangePassword}){
  const [modal,setModal]=useState(null);
  const [showChgPw,setShowChgPw]=useState(false);
  const myReqs=requests.filter(r=>r.emp_id===currentUser.id).sort((a,b)=>a.date.localeCompare(b.date));
  const usedPaid=myReqs.filter(r=>r.type==="有給休暇"&&r.status==="approved").reduce((s,r)=>s+(r.half?0.5:1),0);

  const statusColor={approved:"#10b981",pending:"#f59e0b",rejected:"#ef4444"};
  const statusLabel={approved:t("承認済","승인"),pending:t("審査中","심사중"),rejected:t("却下","반려")};

  return (
    <div style={S.empLayout}>
      <aside style={S.sidebar}>
        <div style={S.card}>
          <div style={S.bigAv}>{currentUser.avatar}</div>
          <div style={S.empName}>{lang==="ja"?currentUser.name:currentUser.name_ko}</div>
          <div style={S.empDept}>{currentUser.dept}</div>
          <div style={S.infoRow}>
            <span style={{fontSize:12,color:"#6b7280"}}>{t("選択休暇曜日","선택휴무 요일")}</span>
            <span style={S.badge}>{currentUser.selected_day_off}曜日</span>
          </div>
          <button style={{...S.editBtn,width:"100%",marginTop:12,textAlign:"center"}}
            onClick={()=>setShowChgPw(true)}>
            🔑 {t("パスワード変更","비밀번호 변경")}
          </button>
        </div>

        {/* 유급 잔여 */}
        <div style={S.card}>
          <div style={S.statTitle}>{t("有給残日数","잔여 유급")}</div>
          <div style={S.statBig}>{currentUser.remaining_paid_leave}
            <span style={{fontSize:14,color:"#9ca3af"}}>{t("日","일")}</span>
          </div>
          <div style={S.bar}>
            <div style={{...S.barFill,width:`${Math.min(100,(currentUser.remaining_paid_leave/20)*100)}%`}}/>
          </div>
          <div style={{fontSize:11,color:"#9ca3af"}}>{t("取得済","사용")}: {usedPaid}{t("日","일")}</div>
        </div>

        {/* 색상 범례 */}
        <div style={S.card}>
          <div style={{...S.statTitle,marginBottom:10}}>{t("凡例","범례")}</div>
          {[
            {bg:COLOR.sentaku.bg,tc:COLOR.sentaku.text,label:t("選択休暇","선택휴무")},
            {bg:COLOR.yukyu.bg,tc:COLOR.yukyu.text,label:t("有給休暇","유급휴가")},
            {bg:COLOR.half.bg,tc:COLOR.half.text,label:t("半休","반차")},
            {bg:"#fef3c7",tc:"#92400e",label:t("審査中","심사중")},
          ].map(({bg,tc,label})=>(
            <div key={label} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{width:14,height:14,borderRadius:3,background:bg,border:`1px solid ${tc}33`}}/>
              <span style={{fontSize:12,color:"#374151"}}>{label}</span>
            </div>
          ))}
        </div>

        {/* 신청 이력 */}
        <div style={S.card}>
          <div style={{...S.statTitle,marginBottom:10}}>{t("申請履歴","신청 이력")}</div>
          {myReqs.length===0?<div style={S.empty}>{t("申請はありません","신청 없음")}</div>
          :myReqs.map(r=>{
            const cs=getChipStyle(r);
            return (
              <div key={r.id} style={S.histItem}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:600,fontSize:12}}>{r.date}</span>
                  <span style={{...S.pill,background:statusColor[r.status]}}>{statusLabel[r.status]}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                  <span style={{background:cs.bg,color:cs.text,fontSize:10,padding:"1px 6px",borderRadius:4,fontWeight:700}}>
                    {r.type==="選択休暇"?t("選択休暇","선택휴무"):r.half?t("半休","반차"):t("有給休暇","유급휴가")}
                  </span>
                </div>
                {r.status==="pending"&&
                  <button style={S.cancelBtn} onClick={()=>cancel(r.id)}>{t("キャンセル","취소")}</button>}
              </div>
            );
          })}
        </div>
        <button style={{...S.primaryBtn,width:"100%"}} onClick={()=>setModal({date:null})}>
          + {t("休暇申請","휴가 신청")}
        </button>
      </aside>

      {/* 캘린더 */}
      <div style={S.calWrap}>
        <CalHeader year={year} month={month} prev={prevMonth} next={nextMonth}/>
        <CalGrid year={year} month={month} daysInMonth={daysInMonth} firstDay={firstDay} dayLabels={dayLabels}
          renderDay={(ds,dn)=>{
            const my=getMyReq(currentUser.id,ds);
            const appr=getApproved(ds);
            const w=warn.includes(ds);
            const nearHol=isNearHoliday(ds)&&!isOff(ds);
            return (
              <div key={ds} style={{...S.dayCell,...(isOff(ds)?S.dayCellOff:{}),
                ...(w&&!isOff(ds)?{border:"2px solid #f59e0b",background:"#fffbeb"}:{})}}
                onClick={()=>!isOff(ds)&&setModal({date:ds})}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <span style={{...S.dayNum,...dayColor(ds)}}>{dn}</span>
                  <div style={{display:"flex",gap:2}}>
                    {isHoliday(ds)&&<span style={S.holTag}>{JP_HOLIDAYS[ds]?.slice(0,2)}</span>}
                    {w&&!isOff(ds)&&<span title={t("人員不足注意","인원부족 주의")} style={{fontSize:12}}>⚠️</span>}
                    {nearHol&&!w&&<span title={t("連休前後","연휴 전후")} style={{fontSize:10,color:"#f59e0b"}}>★</span>}
                  </div>
                </div>
                {/* 본인 신청 표시 */}
                {my&&(()=>{
                  const cs=getChipStyle(my);
                  return (
                    <div style={{...S.chip,background:cs.bg,color:cs.text,border:`1px solid ${cs.bg}`}}>
                      {my.type==="選択休暇"?t("選休","선택"):my.half?t("半休","반차"):t("有給","유급")}
                    </div>
                  );
                })()}
                {/* 다른 직원 수 표시 */}
                {!my&&!isOff(ds)&&appr.length>0&&(
                  <div style={{...S.chip,background:"#f1f5f9",color:"#64748b"}}>{appr.length}名</div>
                )}
              </div>
            );
          }}
        />
      </div>

      {modal&&<ReqModal t={t} initDate={modal.date} empId={currentUser.id}
        selectedDayOff={currentUser.selected_day_off}
        onSubmit={f=>{submitRequest(f);setModal(null);}} onClose={()=>setModal(null)}/>}
      {showChgPw&&<ChangePwModal t={t} user={currentUser}
        onSave={onChangePassword} onClose={()=>setShowChgPw(false)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADMIN VIEW
// ══════════════════════════════════════════════════════════════════
function AdminView({lang,t,employees,allAccounts,requests,year,month,prevMonth,nextMonth,
  daysInMonth,firstDay,dayLabels,warn,getApproved,getAllForDate,approve,reject,
  downloadCSV,pendingList,addEmployee,updateEmployee,deleteEmployee,resetPassword}){
  const [tab,setTab]=useState("calendar");
  const [filter,setFilter]=useState("all");
  const [dayModal,setDayModal]=useState(null);
  const [adminAddModal,setAdminAddModal]=useState(null); // {date} 관리자 직접 지정
  const statusColor={approved:"#10b981",pending:"#f59e0b",rejected:"#ef4444"};
  const statusLabel={approved:t("承認済","승인"),pending:t("審査中","심사중"),rejected:t("却下","반려")};
  const empOnly=employees.filter(e=>e.role==="employee");

  return (
    <div style={S.adminWrap}>
      <div style={S.tabBar}>
        {[["calendar",t("📅 月間","📅 캘린더")],
          ["pending",t(`✋ 承認待ち(${pendingList.length})`,`✋ 승인대기(${pendingList.length})`)],
          ["members",t("👥 社員管理","👥 직원관리")],
          ["stats",t("📊 統計","📊 통계")]].map(([k,l])=>(
          <button key={k} style={{...S.tab,...(tab===k?S.tabOn:{})}} onClick={()=>setTab(k)}>{l}</button>
        ))}
        <div style={{flex:1}}/><button style={S.csvBtn} onClick={downloadCSV}>⬇ CSV</button>
      </div>

      <div style={{padding:"16px 20px"}}>
        {tab==="calendar"&&(<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:12}}>
            <CalHeader year={year} month={month} prev={prevMonth} next={nextMonth}/>
            <select style={S.select} value={filter} onChange={e=>setFilter(e.target.value)}>
              <option value="all">{t("全員","전체")}</option>
              {empOnly.map(e=><option key={e.id} value={e.id}>{lang==="ja"?e.name:e.name_ko}</option>)}
            </select>
          </div>

          {warn.length>0&&(<div style={S.warnBanner}>
            ⚠️ {t(`${warn.length}日間、人員不足または連休集中の恐れ: `,`${warn.length}일 인원부족/연휴집중 경고: `)}
            {warn.map(w=><span key={w} style={S.warnDate}>{w.slice(5)}</span>)}
          </div>)}

          {/* 범례 */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
            {[
              {bg:COLOR.sentaku.bg,tc:COLOR.sentaku.text,label:t("選択休暇","선택휴무")},
              {bg:COLOR.yukyu.bg,tc:COLOR.yukyu.text,label:t("有給休暇","유급휴가")},
              {bg:COLOR.half.bg,tc:COLOR.half.text,label:t("半休","반차")},
              {bg:"#fef3c7",tc:"#92400e",label:t("⏳ 審査中","⏳ 심사중")},
              {bg:"#fffbeb",tc:"#92400e",label:t("⚠️ 人員不足","⚠️ 인원부족")},
            ].map(({bg,tc,label})=>(
              <div key={label} style={{display:"flex",alignItems:"center",gap:4,fontSize:11}}>
                <div style={{width:12,height:12,borderRadius:3,background:bg,border:"1px solid #e2e8f0"}}/>
                <span style={{color:tc}}>{label}</span>
              </div>
            ))}
          </div>

          <CalGrid year={year} month={month} daysInMonth={daysInMonth} firstDay={firstDay} dayLabels={dayLabels}
            renderDay={(ds,dn)=>{
              const all=getAllForDate(ds).filter(r=>filter==="all"||r.emp_id===+filter);
              const appr=all.filter(r=>r.status==="approved");
              const pend=all.filter(r=>r.status==="pending");
              const w=warn.includes(ds);
              const nearHol=isNearHoliday(ds)&&!isOff(ds);
              return (
                <div key={ds} style={{...S.dayCell,...(isOff(ds)?S.dayCellOff:{}),
                  ...(w?{border:"2px solid #f59e0b",background:"#fffbeb"}:{}),
                  ...(nearHol&&!w?{borderTop:"2px solid #fbbf24"}:{}),
                  minHeight:90,cursor:isOff(ds)?"default":"pointer"}}
                  onClick={()=>!isOff(ds)&&setDayModal({date:ds,reqs:all})}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span style={{...S.dayNum,...dayColor(ds)}}>{dn}</span>
                    <div style={{display:"flex",gap:2,alignItems:"center"}}>
                      {isHoliday(ds)&&<span style={S.holTag}>{JP_HOLIDAYS[ds]?.slice(0,2)}</span>}
                      {w&&<span style={{fontSize:11}}>⚠️</span>}
                      {nearHol&&!w&&<span style={{fontSize:10,color:"#f59e0b"}}>★</span>}
                    </div>
                  </div>
                  {/* 승인된 직원 이름 표시 */}
                  {appr.map(r=>{
                    const emp=employees.find(a=>a.id===r.emp_id);
                    const cs=getChipStyle(r);
                    const firstName=(lang==="ja"?emp?.name:emp?.name_ko)?.split(" ")[0]||"";
                    return (
                      <div key={r.id} style={{...S.chip,background:cs.bg,color:cs.text,
                        border:`1px solid ${cs.bg}`,fontSize:10,marginTop:2}}>
                        {emp?.avatar} {firstName}{r.half?t("半","반"):""}
                      </div>
                    );
                  })}
                  {pend.length>0&&(
                    <div style={{...S.chip,background:"#fef3c7",color:"#92400e",marginTop:2}}>
                      ⏳{pend.length}{t("名","명")}
                    </div>
                  )}
                </div>
              );
            }}
          />
        </>)}

        {tab==="pending"&&(<>
          <h3 style={S.secTitle}>{t("休暇承認待ちリスト","휴가 승인 대기 목록")}</h3>
          {pendingList.length===0?<div style={S.empty}>{t("承認待ちはありません","대기 없음")}</div>
          :pendingList.map(r=>{
            const emp=employees.find(a=>a.id===r.emp_id);
            const cs=getChipStyle({...r,status:"approved"});
            return (
              <div key={r.id} style={S.pendItem}>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <div style={S.smAv}>{emp?.avatar}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700}}>{lang==="ja"?emp?.name:emp?.name_ko}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                      <span style={{background:cs.bg,color:cs.text,fontSize:11,
                        padding:"1px 7px",borderRadius:5,fontWeight:700}}>
                        {r.type==="選択休暇"?t("選択休暇","선택휴무"):r.half?t("半休","반차"):t("有給休暇","유급휴가")}
                      </span>
                      <span style={{fontSize:12,color:"#6b7280"}}>{r.date}</span>
                    </div>
                    {r.note&&<div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{r.note}</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button style={S.approveBtn} onClick={()=>approve(r.id)}>✓ {t("承認","승인")}</button>
                  <button style={S.rejectBtn} onClick={()=>reject(r.id)}>✕ {t("却下","반려")}</button>
                </div>
              </div>
            );
          })}
        </>)}

        {tab==="members"&&(
          <MembersTab lang={lang} t={t} employees={empOnly}
            addEmployee={addEmployee} updateEmployee={updateEmployee}
            deleteEmployee={deleteEmployee} resetPassword={resetPassword}
            requests={requests} approve={approve} reject={reject}
            onAddAdminRequest={async(r)=>{
              try{
                const res=await db.addRequest({...r,status:"approved"});
                if(r.type==="有給休暇"){
                  const emp=employees.find(e=>e.id===r.emp_id);
                  const dec=r.half?0.5:1;
                  const newLeave=Math.max(0,(emp?.remaining_paid_leave||0)-dec);
                  await db.updateEmployee(r.emp_id,{remaining_paid_leave:newLeave});
                }
                await loadData(false);
              }catch(e){alert("エラー: "+e.message);}
            }}
            onDeleteRequest={async(id,req)=>{
              try{
                await db.deleteRequest(id);
                if(req?.status==="approved"&&req.type==="有給休暇"){
                  const emp=employees.find(e=>e.id===req.emp_id);
                  const newLeave=(emp?.remaining_paid_leave||0)+(req.half?0.5:1);
                  await db.updateEmployee(req.emp_id,{remaining_paid_leave:newLeave});
                }
                await loadData(false);
              }catch(e){alert("エラー: "+e.message);}
            }}
            onUpdateLeave={async(empId,newLeave)=>{
              try{
                await db.updateEmployee(empId,{remaining_paid_leave:Number(newLeave)});
                await loadData(false);
              }catch(e){alert("エラー: "+e.message);}
            }}
          />
        )}

        {tab==="stats"&&(<>
          <h3 style={S.secTitle}>{t("社員別休暇統計","직원별 휴가 통계")}</h3>
          <div style={S.statsGrid}>
            {empOnly.map(emp=>{
              const er=requests.filter(r=>r.emp_id===emp.id&&r.status==="approved");
              const paid=er.filter(r=>r.type==="有給休暇").reduce((s,r)=>s+(r.half?0.5:1),0);
              const sel=er.filter(r=>r.type==="選択休暇").length;
              const pct=Math.round((paid/20)*100);
              return (
                <div key={emp.id} style={S.statItem}>
                  <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                    <div style={S.smAv}>{emp.avatar}</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:700}}>{lang==="ja"?emp.name:emp.name_ko}</div>
                      <div style={{fontSize:11,color:"#9ca3af"}}>{emp.dept}</div>
                    </div>
                  </div>
                  <div style={S.sRow}><span>{t("有給残","잔여유급")}</span>
                    <span style={{fontWeight:700,color:emp.remaining_paid_leave<5?"#ef4444":"#10b981"}}>
                      {emp.remaining_paid_leave}{t("日","일")}
                    </span>
                  </div>
                  <div style={S.sRow}><span style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{width:10,height:10,borderRadius:2,background:COLOR.yukyu.bg,display:"inline-block"}}/>
                    {t("有給取得","유급사용")}
                  </span><span>{paid}{t("日","일")}</span></div>
                  <div style={S.sRow}><span style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{width:10,height:10,borderRadius:2,background:COLOR.sentaku.bg,display:"inline-block"}}/>
                    {t("選択休暇","선택휴무")}
                  </span><span>{sel}{t("回","회")}</span></div>
                  <div style={{marginTop:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#9ca3af",marginBottom:3}}>
                      <span>{t("消化率","소진율")}</span><span>{pct}%</span>
                    </div>
                    <div style={S.bar}>
                      <div style={{...S.barFill,width:`${pct}%`,background:pct>80?"#ef4444":"#6366f1"}}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>)}
      </div>

      {/* 날짜 상세 모달 */}
      {dayModal&&(
        <div style={S.overlay} onClick={()=>setDayModal(null)}>
          <div style={S.modalBox} onClick={e=>e.stopPropagation()}>
            <h3 style={S.modalTitle}>📋 {dayModal.date}</h3>
            {isNearHoliday(dayModal.date)&&(
              <div style={{background:"#fef3c7",borderRadius:8,padding:"8px 12px",marginBottom:12,
                fontSize:12,color:"#92400e"}}>
                ★ {t("連休前後の日付です","연휴 전후 날짜입니다")}
              </div>
            )}
            {dayModal.reqs.length===0?<div style={S.empty}>{t("申請なし","신청 없음")}</div>
            :dayModal.reqs.map(r=>{
              const emp=employees.find(a=>a.id===r.emp_id);
              const cs=getChipStyle(r);
              return (
                <div key={r.id} style={{...S.pendItem,marginBottom:8}}>
                  <div style={{display:"flex",gap:10,alignItems:"center",flex:1}}>
                    <div style={S.smAv}>{emp?.avatar}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700}}>{lang==="ja"?emp?.name:emp?.name_ko}</div>
                      <span style={{background:cs.bg,color:cs.text,fontSize:10,
                        padding:"1px 6px",borderRadius:4,fontWeight:700}}>
                        {r.type==="選択休暇"?t("選択休暇","선택휴무"):r.half?t("半休","반차"):t("有給休暇","유급휴가")}
                      </span>
                    </div>
                    <span style={{...S.pill,background:r.status==="approved"?"#10b981":r.status==="pending"?"#f59e0b":"#ef4444"}}>
                      {r.status==="approved"?t("承認済","승인"):r.status==="pending"?t("審査中","심사중"):t("却下","반려")}
                    </span>
                  </div>
                  {r.status==="pending"&&(
                    <div style={{display:"flex",gap:6,marginTop:8}}>
                      <button style={S.approveBtn} onClick={()=>{approve(r.id);setDayModal(null);}}>✓</button>
                      <button style={S.rejectBtn} onClick={()=>{reject(r.id);setDayModal(null);}}>✕</button>
                    </div>
                  )}
                </div>
              );
            })}
            {/* 관리자 직접 지정 버튼 */}
            <div style={{borderTop:"1px solid #e2e8f0",marginTop:12,paddingTop:12}}>
              <button style={{...S.primaryBtn,width:"100%",background:"linear-gradient(135deg,#059669,#10b981)",marginBottom:8}}
                onClick={()=>{setDayModal(null);setAdminAddModal({date:dayModal.date});}}>
                📅 {t("この日に直接指定する","이 날짜에 직접 지정하기")}
              </button>
            </div>
            <button style={{...S.closeBtn,width:"100%",textAlign:"center"}} onClick={()=>setDayModal(null)}>{t("閉じる","닫기")}</button>
          </div>
        </div>
      )}

      {/* 관리자 직접 선택휴무/유급 지정 모달 */}
      {adminAddModal&&(
        <div style={S.overlay} onClick={()=>setAdminAddModal(null)}>
          <div style={{...S.modalBox,maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <h3 style={S.modalTitle}>📅 {t("管理者として直接指定","관리자 직접 지정")}</h3>
            <div style={{background:"#f0fdf4",borderRadius:10,padding:"10px 14px",marginBottom:16,
              fontSize:13,color:"#166534",fontWeight:700}}>
              {adminAddModal.date} ({["日","月","火","水","木","金","土"][new Date(adminAddModal.date).getDay()]}曜日)
            </div>
            <AdminDirectForm
              t={t} lang={lang} employees={empOnly}
              onConfirm={async(empId,type,half,note)=>{
                try{
                  await db.addRequest({emp_id:empId,type,date:adminAddModal.date,
                    status:"approved",note:note||t("管理者指定","관리자 지정"),half:!!half});
                  if(type==="有給休暇"){
                    const emp=employees.find(e=>e.id===empId);
                    const dec=half?0.5:1;
                    const newLeave=Math.max(0,(emp?.remaining_paid_leave||0)-dec);
                    await db.updateEmployee(empId,{remaining_paid_leave:newLeave});
                  }
                  await loadData(false);
                  setAdminAddModal(null);
                  showToast(t("直接指定しました","직접 지정 완료"));
                }catch(e){showToast("エラー: "+e.message,"error");}
              }}
              onClose={()=>setAdminAddModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 관리자 직접 지정 폼
// ══════════════════════════════════════════════════════════════════
function AdminDirectForm({t,lang,employees,onConfirm,onClose}){
  const [empId,setEmpId]=useState(employees[0]?.id||"");
  const [type,setType]=useState("選択休暇");
  const [half,setHalf]=useState(false);
  const [note,setNote]=useState("");
  return (
    <div>
      <div style={S.fg}>
        <label style={S.fl}>{t("社員を選択","직원 선택")}</label>
        <select style={S.input} value={empId} onChange={e=>setEmpId(+e.target.value)}>
          {employees.map(e=><option key={e.id} value={e.id}>{lang==="ja"?e.name:e.name_ko}</option>)}
        </select>
      </div>
      <div style={S.fg}>
        <label style={S.fl}>{t("種別","종류")}</label>
        <div style={{display:"flex",gap:8}}>
          {[
            {val:"選択休暇",bg:COLOR.sentaku.bg,tc:COLOR.sentaku.text,label:t("選択休暇","선택휴무")},
            {val:"有給休暇",bg:COLOR.yukyu.bg,tc:COLOR.yukyu.text,label:t("有給休暇","유급휴가")},
          ].map(o=>(
            <button key={o.val} onClick={()=>setType(o.val)}
              style={{flex:1,padding:"8px",border:`2px solid ${type===o.val?o.tc:"#e2e8f0"}`,
                borderRadius:8,background:type===o.val?o.bg:"#f8fafc",
                color:type===o.val?o.tc:"#6b7280",fontWeight:700,fontSize:13,cursor:"pointer"}}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {type==="有給休暇"&&(
        <div style={S.fg}>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
            <input type="checkbox" checked={half} onChange={e=>setHalf(e.target.checked)}/>
            {t("半休","반차")}
          </label>
        </div>
      )}
      <div style={S.fg}>
        <label style={S.fl}>{t("備考","비고")}</label>
        <input style={S.input} value={note} onChange={e=>setNote(e.target.value)}
          placeholder={t("管理者指定","관리자 지정")}/>
      </div>
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <button style={{...S.primaryBtn,flex:1,background:"linear-gradient(135deg,#059669,#10b981)"}}
          onClick={()=>onConfirm(empId,type,half,note)}>
          ✓ {t("即時確定","즉시 확정")}
        </button>
        <button style={S.closeBtn} onClick={onClose}>{t("キャンセル","취소")}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 직원 관리 탭
// ══════════════════════════════════════════════════════════════════
function MembersTab({lang,t,employees,addEmployee,updateEmployee,deleteEmployee,resetPassword,
  requests,onAddAdminRequest,onDeleteRequest,onUpdateLeave}){
  const EMPTY={name:"",nameKo:"",login_id:"",tempPassword:"temp1234",dept:"営業",selectedDayOff:"月",remainingPaidLeave:20};
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(EMPTY);
  const [confirmDel,setConfirmDel]=useState(null);
  const [resetModal,setResetModal]=useState(null);
  const [newTempPw,setNewTempPw]=useState("temp1234");
  const [showPw,setShowPw]=useState(false);
  const [visiblePwIds,setVisiblePwIds]=useState({});
  function togglePw(id){setVisiblePwIds(p=>({...p,[id]:!p[id]}));}
  // 관리자 직접 조작
  const [schedModal,setSchedModal]=useState(null); // {emp} 직원 대신 신청
  const [leaveModal,setLeaveModal]=useState(null); // {emp} 유급 수정
  const [newLeave,setNewLeave]=useState(0);
  function openAdd(){setForm(EMPTY);setEditId(null);setShowForm(true);}
  function openEdit(emp){
    setForm({name:emp.name,nameKo:emp.name_ko,login_id:emp.login_id,tempPassword:emp.password,
      dept:emp.dept,selectedDayOff:emp.selected_day_off,remainingPaidLeave:emp.remaining_paid_leave});
    setEditId(emp.id);setShowForm(true);
  }
  async function handleSave(){
    if(!form.name||!form.login_id||!form.tempPassword)return;
    let ok;
    if(editId!==null)ok=await updateEmployee(editId,{...form,password:form.tempPassword});
    else ok=await addEmployee(form);
    if(ok!==false){setShowForm(false);setEditId(null);}
  }
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h3 style={{...S.secTitle,margin:0}}>{t("社員一覧","직원 목록")} ({employees.length}{t("名","명")})</h3>
        <button style={S.primaryBtn} onClick={openAdd}>+ {t("社員を追加","직원 추가")}</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {employees.length===0&&<div style={S.empty}>{t("社員がいません","등록된 직원이 없습니다")}</div>}
        {employees.map(emp=>(
          <div key={emp.id} style={S.memberRow}>
            <div style={{display:"flex",gap:12,alignItems:"center",flex:1}}>
              <div style={S.smAv}>{emp.avatar}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,fontSize:14}}>{lang==="ja"?emp.name:emp.name_ko}</span>
                  {emp.must_change_password
                    ?<span style={{...S.rolePill,background:"#fef3c7",color:"#92400e",fontSize:10}}>{t("仮PW","임시PW")}</span>
                    :<span style={{...S.rolePill,background:"#d1fae5",color:"#065f46",fontSize:10}}>{t("PW変更済","PW변경")}</span>}
                </div>
                <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>
                  {emp.dept} ·
                  <span style={{background:COLOR.sentaku.bg,color:COLOR.sentaku.text,
                    fontSize:10,padding:"0 5px",borderRadius:4,marginLeft:4,fontWeight:700}}>
                    {emp.selected_day_off}曜
                  </span>
                  · {t("有給残","잔여")}: {emp.remaining_paid_leave}{t("日","일")}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginTop:4,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:"#9ca3af"}}>ID: <code style={S.code}>{emp.login_id}</code></span>
                  <span style={{fontSize:11,color:"#9ca3af",display:"flex",alignItems:"center",gap:4}}>
                    PW: <code style={S.code}>{visiblePwIds[emp.id]?emp.password:"••••••••"}</code>
                    <button onClick={()=>togglePw(emp.id)}
                      style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:0,color:"#9ca3af"}}>
                      {visiblePwIds[emp.id]?"🙈":"👁"}
                    </button>
                  </span>
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <button style={S.editBtn} onClick={()=>openEdit(emp)}>✏</button>
              <button style={{...S.editBtn,background:"#f3e8ff",color:"#7e22ce"}}
                onClick={()=>{setResetModal(emp);setNewTempPw("temp1234");}}>🔑</button>
              <button style={{...S.editBtn,background:"#dcfce7",color:"#166534"}}
                onClick={()=>setSchedModal(emp)} title={t("休暇を代わりに登録","휴가 직접 등록")}>📅</button>
              <button style={{...S.editBtn,background:"#fef9c3",color:"#854d0e"}}
                onClick={()=>{setLeaveModal(emp);setNewLeave(emp.remaining_paid_leave);}}
                title={t("有給日数を修正","유급일수 수정")}>✏️有給</button>
              <button style={S.delBtn} onClick={()=>setConfirmDel(emp)}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {showForm&&(
        <div style={S.overlay} onClick={()=>setShowForm(false)}>
          <div style={{...S.modalBox,maxWidth:520}} onClick={e=>e.stopPropagation()}>
            <h3 style={S.modalTitle}>{editId!==null?t("社員情報を編集","직원 정보 편집"):t("新しい社員を追加","새 직원 추가")}</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label={t("氏名（日本語）","이름（일본어）")} req>
                <input style={S.input} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="田中 健太"/>
              </Field>
              <Field label={t("氏名（韓国語）","이름（한국어）")}>
                <input style={S.input} value={form.nameKo} onChange={e=>setForm(f=>({...f,nameKo:e.target.value}))} placeholder="다나카 켄타"/>
              </Field>
              <Field label={t("ログインID","로그인 ID")} req>
                <input style={S.input} value={form.login_id} onChange={e=>setForm(f=>({...f,login_id:e.target.value}))} placeholder="tanaka"/>
              </Field>
              <Field label={t("仮パスワード","임시 비밀번호")} req>
                <div style={{position:"relative"}}>
                  <input style={{...S.input,paddingRight:36}} value={form.tempPassword}
                    type={showPw?"text":"password"} onChange={e=>setForm(f=>({...f,tempPassword:e.target.value}))}/>
                  <button style={S.eyeBtn} onClick={()=>setShowPw(v=>!v)}>{showPw?"🙈":"👁"}</button>
                </div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:3}}>{t("初回ログイン時に変更が求められます","첫 로그인 시 변경 요구")}</div>
              </Field>
              <Field label={t("部署","부서")}>
                <select style={S.input} value={form.dept} onChange={e=>setForm(f=>({...f,dept:e.target.value}))}>
                  {DEPT_OPTIONS.map(d=><option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label={t("選択休暇曜日","선택휴무 요일")}>
                <select style={S.input} value={form.selectedDayOff} onChange={e=>setForm(f=>({...f,selectedDayOff:e.target.value}))}>
                  {["月","水","土"].map(d=>(
                    <option key={d} value={d}>{d}曜日</option>
                  ))}
                </select>
              </Field>
              <Field label={t("有給残日数","잔여 유급일수")}>
                <input style={S.input} type="number" min="0" max="40" value={form.remainingPaidLeave}
                  onChange={e=>setForm(f=>({...f,remainingPaidLeave:e.target.value}))}/>
              </Field>
            </div>
            <div style={{display:"flex",gap:8,marginTop:20}}>
              <button style={S.primaryBtn} onClick={handleSave}>{editId!==null?t("更新","업데이트"):t("追加","추가")}</button>
              <button style={S.closeBtn} onClick={()=>setShowForm(false)}>{t("キャンセル","취소")}</button>
            </div>
          </div>
        </div>
      )}

      {resetModal&&(
        <div style={S.overlay} onClick={()=>setResetModal(null)}>
          <div style={{...S.modalBox,maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <h3 style={S.modalTitle}>🔑 {t("仮パスワード再発行","임시 비밀번호 재발급")}</h3>
            <div style={{background:"#f8fafc",borderRadius:10,padding:"12px 14px",marginBottom:16,
              display:"flex",alignItems:"center",gap:10}}>
              <div style={S.smAv}>{resetModal.avatar}</div>
              <div><div style={{fontWeight:700}}>{lang==="ja"?resetModal.name:resetModal.name_ko}</div>
                <div style={{fontSize:12,color:"#9ca3af"}}>ID: {resetModal.login_id}</div></div>
            </div>
            <div style={S.fg}>
              <label style={S.fl}>{t("新しい仮パスワード","새 임시 비밀번호")}</label>
              <input style={S.input} value={newTempPw} onChange={e=>setNewTempPw(e.target.value)}/>
            </div>
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button style={S.primaryBtn} onClick={()=>{resetPassword(resetModal.id,newTempPw);setResetModal(null);}}>
                {t("再発行する","재발급하기")}
              </button>
              <button style={S.closeBtn} onClick={()=>setResetModal(null)}>{t("キャンセル","취소")}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDel&&(
        <div style={S.overlay} onClick={()=>setConfirmDel(null)}>
          <div style={{...S.modalBox,maxWidth:360}} onClick={e=>e.stopPropagation()}>
            <h3 style={{...S.modalTitle,color:"#ef4444"}}>🗑 {t("本当に削除しますか？","정말 삭제할까요?")}</h3>
            <p style={{fontSize:14,color:"#374151",marginBottom:20}}>
              <strong>{lang==="ja"?confirmDel.name:confirmDel.name_ko}</strong>{t("さんを削除します。","을 삭제합니다.")}
            </p>
            <div style={{display:"flex",gap:8}}>
              <button style={{...S.rejectBtn,padding:"10px 20px",fontSize:14}}
                onClick={()=>{deleteEmployee(confirmDel.id);setConfirmDel(null);}}>
                {t("削除","삭제")}
              </button>
              <button style={S.closeBtn} onClick={()=>setConfirmDel(null)}>{t("キャンセル","취소")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 관리자 직접 휴가 등록 모달 ── */}
      {schedModal&&(
        <AdminSchedModal t={t} lang={lang} emp={schedModal}
          requests={requests}
          onAdd={(r)=>onAddAdminRequest(r)}
          onDelete={(id,req)=>onDeleteRequest(id,req)}
          onClose={()=>setSchedModal(null)}/>
      )}

      {/* ── 유급 일수 직접 수정 모달 ── */}
      {leaveModal&&(
        <div style={S.overlay} onClick={()=>setLeaveModal(null)}>
          <div style={{...S.modalBox,maxWidth:360}} onClick={e=>e.stopPropagation()}>
            <h3 style={S.modalTitle}>✏️有給 {t("有給日数を修正","유급일수 수정")}</h3>
            <div style={{background:"#f8fafc",borderRadius:10,padding:"12px 14px",marginBottom:16,
              display:"flex",alignItems:"center",gap:10}}>
              <div style={S.smAv}>{leaveModal.avatar}</div>
              <div>
                <div style={{fontWeight:700}}>{lang==="ja"?leaveModal.name:leaveModal.name_ko}</div>
                <div style={{fontSize:12,color:"#9ca3af"}}>{t("現在","현재")}: {leaveModal.remaining_paid_leave}{t("日","일")}</div>
              </div>
            </div>
            <div style={S.fg}>
              <label style={S.fl}>{t("新しい有給残日数","새 잔여 유급일수")}</label>
              <input style={S.input} type="number" min="0" max="40" value={newLeave}
                onChange={e=>setNewLeave(e.target.value)}/>
            </div>
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button style={S.primaryBtn} onClick={()=>{onUpdateLeave(leaveModal.id,newLeave);setLeaveModal(null);}}>
                {t("保存","저장")}
              </button>
              <button style={S.closeBtn} onClick={()=>setLeaveModal(null)}>{t("キャンセル","취소")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 관리자 직접 휴가 등록/삭제 모달
// ══════════════════════════════════════════════════════════════════
function AdminSchedModal({t,lang,emp,requests,onAdd,onDelete,onClose}){
  const [type,setType]=useState("選択休暇");
  const [date,setDate]=useState("");
  const [half,setHalf]=useState(false);
  const [note,setNote]=useState("");
  const empReqs=requests.filter(r=>r.emp_id===emp.id).sort((a,b)=>a.date.localeCompare(b.date));
  const SC={approved:"#10b981",pending:"#f59e0b",rejected:"#ef4444"};
  const SL={approved:t("承認済","승인"),pending:t("審査中","심사중"),rejected:t("却下","반려")};

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.modalBox,maxWidth:500}} onClick={e=>e.stopPropagation()}>
        <h3 style={S.modalTitle}>📅 {lang==="ja"?emp.name:emp.name_ko} {t("の休暇管理","의 휴가 관리")}</h3>

        {/* 직접 등록 폼 */}
        <div style={{background:"#f0fdf4",borderRadius:12,padding:"14px 16px",marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:"#166534",marginBottom:10}}>
            + {t("新規登録（即時承認）","신규 등록（즉시 승인）")}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div>
              <label style={{...S.fl,fontSize:11}}>{t("種別","종류")}</label>
              <select style={S.input} value={type} onChange={e=>setType(e.target.value)}>
                <option value="選択休暇">{t("選択休暇","선택휴무")}</option>
                <option value="有給休暇">{t("有給休暇","유급휴가")}</option>
              </select>
            </div>
            <div>
              <label style={{...S.fl,fontSize:11}}>{t("日付","날짜")}</label>
              <input type="date" style={S.input} value={date} onChange={e=>setDate(e.target.value)}/>
            </div>
          </div>
          {type==="有給休暇"&&(
            <div style={{marginBottom:8}}>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
                <input type="checkbox" checked={half} onChange={e=>setHalf(e.target.checked)}/>
                {t("半休","반차")}
              </label>
            </div>
          )}
          <input style={{...S.input,marginBottom:8}} value={note}
            onChange={e=>setNote(e.target.value)} placeholder={t("備考（任意）","비고（선택）")}/>
          <button style={{...S.primaryBtn,width:"100%",padding:"8px"}}
            onClick={()=>{
              if(!date){alert(t("日付を選択してください","날짜를 선택하세요"));return;}
              onAdd({emp_id:emp.id,type,date,note,half});
            }}>
            {t("登録する","등록하기")}
          </button>
        </div>

        {/* 기존 신청 목록 */}
        <div style={{fontSize:13,fontWeight:700,color:"#374151",marginBottom:8}}>
          {t("申請履歴","신청 이력")} ({empReqs.length}{t("件","건")})
        </div>
        {empReqs.length===0?<div style={S.empty}>{t("申請なし","신청 없음")}</div>
        :empReqs.map(r=>{
          const cs=getChipStyle(r);
          return (
            <div key={r.id} style={{...S.pendItem,marginBottom:8,padding:"10px 12px"}}>
              <div style={{display:"flex",gap:8,alignItems:"center",flex:1}}>
                <span style={{background:cs.bg,color:cs.text,fontSize:11,
                  padding:"1px 7px",borderRadius:5,fontWeight:700}}>
                  {r.type==="選択休暇"?t("選択","선택"):r.half?t("半休","반차"):t("有給","유급")}
                </span>
                <span style={{fontSize:12,fontWeight:600}}>{r.date}</span>
                <span style={{...S.pill,background:SC[r.status],fontSize:10}}>{SL[r.status]}</span>
              </div>
              <button style={{...S.rejectBtn,padding:"4px 10px",fontSize:12}}
                onClick={()=>onDelete(r.id,r)}>
                🗑 {t("削除","삭제")}
              </button>
            </div>
          );
        })}

        <button style={{...S.closeBtn,marginTop:12,width:"100%",textAlign:"center"}}
          onClick={onClose}>{t("閉じる","닫기")}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 휴가 신청 모달
// ══════════════════════════════════════════════════════════════════
function ReqModal({t,initDate,empId,selectedDayOff,onSubmit,onClose}){
  const [type,setType]=useState("選択休暇");
  const [date,setDate]=useState(initDate||"");
  const [note,setNote]=useState("");
  const [half,setHalf]=useState(false);

  // 선택휴무: 직원은 월/수/토 중 선택
  const dayOffLabel="月・水・土";

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modalBox} onClick={e=>e.stopPropagation()}>
        <h3 style={S.modalTitle}>📋 {t("休暇申請","휴가 신청")}</h3>

        {/* 종류 선택 */}
        <div style={S.fg}>
          <label style={S.fl}>{t("休暇の種類","휴가 종류")}</label>
          <div style={{display:"flex",gap:8}}>
            {[
              {val:"選択休暇",bg:COLOR.sentaku.bg,tc:COLOR.sentaku.text,
               label:t(`選択休暇（${dayOffLabel}）`,`선택휴무（${dayOffLabel}）`)},
              {val:"有給休暇",bg:COLOR.yukyu.bg,tc:COLOR.yukyu.text,
               label:t("有給休暇","유급휴가")},
            ].map(o=>(
              <button key={o.val} onClick={()=>setType(o.val)}
                style={{flex:1,padding:"10px 6px",border:`2px solid ${type===o.val?o.tc:"#e2e8f0"}`,
                  borderRadius:10,background:type===o.val?o.bg:"#f8fafc",
                  color:type===o.val?o.tc:"#6b7280",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div style={S.fg}>
          <label style={S.fl}>{t("日付","날짜")}</label>
          <input type="date" style={S.input} value={date} onChange={e=>setDate(e.target.value)}/>
          {type==="選択休暇"&&<div style={{fontSize:11,color:"#6366f1",marginTop:4}}>
            ※ {t(`${dayOffLabel}のみ申請可能です`,`${dayOffLabel}만 신청 가능합니다`)}
          </div>}
        </div>

        {type==="有給休暇"&&(
          <div style={S.fg}>
            <label style={S.fl}>{t("取得区分","취득 구분")}</label>
            <div style={{display:"flex",gap:8}}>
              {[
                {val:false,label:t("全日","전일"),bg:COLOR.yukyu.bg,tc:COLOR.yukyu.text},
                {val:true, label:t("半休","반차"),bg:COLOR.half.bg,tc:COLOR.half.text},
              ].map(o=>(
                <button key={String(o.val)} onClick={()=>setHalf(o.val)}
                  style={{flex:1,padding:"8px",border:`2px solid ${half===o.val?o.tc:"#e2e8f0"}`,
                    borderRadius:8,background:half===o.val?o.bg:"#f8fafc",
                    color:half===o.val?o.tc:"#6b7280",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={S.fg}>
          <label style={S.fl}>{t("備考・理由","비고·사유")}</label>
          <textarea style={{...S.input,height:60,resize:"vertical"}} value={note}
            onChange={e=>setNote(e.target.value)} placeholder={t("任意で入力","선택 입력")}/>
        </div>

        <div style={{display:"flex",gap:8,marginTop:16}}>
          <button style={S.primaryBtn} onClick={()=>onSubmit({empId,type,date,note,half})}>
            {t("申請する","신청하기")}
          </button>
          <button style={S.closeBtn} onClick={onClose}>{t("キャンセル","취소")}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 비밀번호 변경 모달
// ══════════════════════════════════════════════════════════════════
function ChangePwModal({t,user,onSave,onClose}){
  const [cur,setCur]=useState("");const [nw,setNw]=useState("");const [nw2,setNw2]=useState("");
  const [show,setShow]=useState(false);const [err,setErr]=useState("");
  function handleSave(){
    if(cur!==user.password){setErr(t("現在のパスワードが違います","현재 비밀번호 틀림"));return;}
    if(nw.length<6){setErr(t("6文字以上","6자 이상"));return;}
    if(nw!==nw2){setErr(t("パスワードが一致しません","비밀번호 불일치"));return;}
    setErr("");onSave(nw);onClose();
  }
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modalBox} onClick={e=>e.stopPropagation()}>
        <h3 style={S.modalTitle}>🔑 {t("パスワード変更","비밀번호 변경")}</h3>
        <div style={S.fg}><label style={S.fl}>{t("現在のパスワード","현재 비밀번호")}</label>
          <div style={{position:"relative"}}>
            <input style={{...S.input,paddingRight:40}} value={cur} type={show?"text":"password"}
              onChange={e=>{setCur(e.target.value);setErr("");}}/>
            <button style={S.eyeBtn} onClick={()=>setShow(v=>!v)}>{show?"🙈":"👁"}</button>
          </div>
        </div>
        <div style={S.fg}><label style={S.fl}>{t("新しいパスワード","새 비밀번호")}</label>
          <input style={S.input} value={nw} type="password"
            onChange={e=>{setNw(e.target.value);setErr("");}} placeholder={t("6文字以上","6자 이상")}/>
        </div>
        <div style={S.fg}><label style={S.fl}>{t("パスワード確認","비밀번호 확인")}</label>
          <input style={S.input} value={nw2} type="password"
            onChange={e=>{setNw2(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&handleSave()}/>
        </div>
        {err&&<div style={{color:"#ef4444",fontSize:12,marginBottom:8}}>⚠ {err}</div>}
        <div style={{display:"flex",gap:8,marginTop:16}}>
          <button style={S.primaryBtn} onClick={handleSave}>{t("変更する","변경하기")}</button>
          <button style={S.closeBtn} onClick={onClose}>{t("キャンセル","취소")}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 공통 컴포넌트
// ══════════════════════════════════════════════════════════════════
function CalHeader({year,month,prev,next}){
  return (<div style={{display:"flex",alignItems:"center",gap:16}}>
    <button style={S.navBtn} onClick={prev}>‹</button>
    <h2 style={{fontSize:20,fontWeight:800,margin:0}}>{year}年 {MONTHS_JP[month]}</h2>
    <button style={S.navBtn} onClick={next}>›</button>
  </div>);
}
function CalGrid({year,month,daysInMonth,firstDay,dayLabels,renderDay}){
  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push(<div key={`e${i}`}/>);
  for(let d=1;d<=daysInMonth;d++) cells.push(renderDay(fmt(year,month,d),d));
  return (<div style={S.calGrid}>
    {dayLabels.map((l,i)=><div key={l} style={{...S.dayHdr,
      ...(i===0?{color:"#ef4444"}:i===6?{color:"#3b82f6"}:{})}}>{l}</div>)}
    {cells}
  </div>);
}
function LangToggle({lang,setLang}){
  return (<div style={S.langSwitch}>
    <button style={{...S.langBtn,...(lang==="ja"?S.langOn:{})}} onClick={()=>setLang("ja")}>日本語</button>
    <button style={{...S.langBtn,...(lang==="ko"?S.langOn:{})}} onClick={()=>setLang("ko")}>한국어</button>
  </div>);
}
function Toast({msg,type}){
  return <div style={{...S.toast,
    background:type==="error"?"#ef4444":type==="warn"?"#f59e0b":"#10b981"}}>{msg}</div>;
}
function Field({label,req,children}){
  return (<div><label style={{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:5}}>
    {label}{req&&<span style={{color:"#ef4444",marginLeft:3}}>*</span>}
  </label>{children}</div>);
}

const S={
  root:{minHeight:"100vh",background:"#f1f5f9",fontFamily:"'Noto Sans JP','Malgun Gothic',sans-serif",color:"#1e293b"},
  loginBg:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
    background:"linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%)",padding:16},
  loginCard:{background:"#fff",borderRadius:20,padding:"32px 28px",width:"100%",maxWidth:420,
    boxShadow:"0 24px 80px rgba(0,0,0,0.2)"},
  loginSub:{fontSize:12,color:"#9ca3af",textAlign:"center",marginBottom:8},
  eyeBtn:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
    background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#9ca3af"},
  header:{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"12px 20px",
    display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",
    position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"},
  logo:{display:"flex",alignItems:"center",gap:10},
  logoIcon:{width:40,height:40,background:"#fff",border:"2px solid #e2e8f0",borderRadius:10,
    display:"flex",alignItems:"center",justifyContent:"center"},
  logoSub:{fontSize:11,color:"#94a3b8"},
  userChip:{display:"flex",alignItems:"center",gap:8,background:"#f8fafc",
    border:"1px solid #e2e8f0",borderRadius:10,padding:"6px 12px"},
  userAv:{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#a78bfa)",
    color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"},
  rolePill:{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:6},
  logoutBtn:{background:"#f1f5f9",border:"none",borderRadius:8,padding:"6px 14px",
    fontSize:13,cursor:"pointer",fontWeight:600,color:"#374151"},
  langSwitch:{display:"flex",background:"#f1f5f9",borderRadius:8,overflow:"hidden"},
  langBtn:{padding:"5px 12px",border:"none",background:"transparent",cursor:"pointer",
    fontSize:12,color:"#64748b",fontWeight:600},
  langOn:{background:"#6366f1",color:"#fff",borderRadius:8},
  main:{maxWidth:1200,margin:"0 auto",padding:"20px 16px"},
  empLayout:{display:"grid",gridTemplateColumns:"260px 1fr",gap:20},
  sidebar:{display:"flex",flexDirection:"column",gap:14},
  card:{background:"#fff",borderRadius:14,padding:18,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"},
  bigAv:{width:52,height:52,borderRadius:"50%",
    background:"linear-gradient(135deg,#6366f1,#a78bfa)",color:"#fff",fontSize:22,fontWeight:700,
    display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"},
  smAv:{width:36,height:36,borderRadius:"50%",
    background:"linear-gradient(135deg,#6366f1,#a78bfa)",color:"#fff",fontSize:15,fontWeight:700,
    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  empName:{fontSize:16,fontWeight:700,textAlign:"center",marginBottom:4},
  empDept:{fontSize:12,color:"#6b7280",textAlign:"center",marginBottom:10},
  infoRow:{display:"flex",justifyContent:"space-between",alignItems:"center"},
  badge:{background:"#ede9fe",color:"#6d28d9",padding:"2px 8px",borderRadius:10,fontSize:12,fontWeight:700},
  statTitle:{fontSize:12,color:"#6b7280",marginBottom:4},
  statBig:{fontSize:36,fontWeight:800,lineHeight:1},
  bar:{height:6,background:"#e2e8f0",borderRadius:3,margin:"8px 0 4px",overflow:"hidden"},
  barFill:{height:"100%",background:"#6366f1",borderRadius:3,transition:"width 0.4s"},
  histItem:{background:"#f8fafc",borderRadius:8,padding:10,marginBottom:8,fontSize:12},
  pill:{color:"#fff",fontSize:10,padding:"1px 7px",borderRadius:8,fontWeight:600},
  cancelBtn:{marginTop:6,background:"#fee2e2",color:"#991b1b",border:"none",borderRadius:6,
    padding:"3px 10px",fontSize:11,cursor:"pointer",fontWeight:600},
  calWrap:{background:"#fff",borderRadius:16,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"},
  calGrid:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3},
  dayHdr:{textAlign:"center",fontSize:12,fontWeight:700,color:"#6b7280",padding:"6px 0"},
  dayCell:{border:"1px solid #f1f5f9",borderRadius:8,padding:"5px 6px",minHeight:70,
    cursor:"pointer",fontSize:12,transition:"background 0.1s"},
  dayCellOff:{background:"#f8fafc",cursor:"default"},
  dayNum:{fontSize:13,fontWeight:700,color:"#374151"},
  holTag:{fontSize:9,background:"#fee2e2",color:"#991b1b",borderRadius:4,padding:"1px 3px",
    maxWidth:36,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  chip:{fontSize:10,padding:"2px 5px",borderRadius:5,fontWeight:700,marginTop:2,display:"block",
    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  adminWrap:{background:"#fff",borderRadius:16,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"},
  tabBar:{display:"flex",gap:2,background:"#f8fafc",padding:"10px 14px 0",
    borderBottom:"1px solid #e2e8f0",alignItems:"center",overflowX:"auto"},
  tab:{padding:"8px 14px",border:"none",background:"transparent",cursor:"pointer",
    fontSize:13,fontWeight:600,color:"#6b7280",borderBottom:"2px solid transparent",
    marginBottom:-1,whiteSpace:"nowrap"},
  tabOn:{color:"#6366f1",borderBottom:"2px solid #6366f1"},
  csvBtn:{background:"#f1f5f9",border:"none",borderRadius:8,padding:"6px 14px",
    fontSize:12,cursor:"pointer",fontWeight:600,color:"#374151",marginBottom:2,whiteSpace:"nowrap"},
  select:{padding:"6px 10px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:13,
    background:"#fff",cursor:"pointer"},
  warnBanner:{background:"#fef3c7",border:"1px solid #f59e0b",borderRadius:10,
    padding:"10px 16px",marginBottom:12,fontSize:13,color:"#92400e",
    display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"},
  warnDate:{background:"#f59e0b",color:"#fff",borderRadius:6,padding:"1px 7px",fontSize:11,fontWeight:700},
  navBtn:{background:"#f1f5f9",border:"none",borderRadius:8,width:34,height:34,
    fontSize:20,cursor:"pointer",color:"#374151",fontWeight:700},
  pendItem:{display:"flex",justifyContent:"space-between",alignItems:"center",
    padding:"12px 14px",border:"1px solid #e2e8f0",borderRadius:10,marginBottom:10,
    background:"#fafafa",flexWrap:"wrap",gap:8},
  approveBtn:{background:"#d1fae5",color:"#065f46",border:"none",borderRadius:8,
    padding:"6px 14px",fontSize:13,fontWeight:700,cursor:"pointer"},
  rejectBtn:{background:"#fee2e2",color:"#991b1b",border:"none",borderRadius:8,
    padding:"6px 14px",fontSize:13,fontWeight:700,cursor:"pointer"},
  memberRow:{display:"flex",justifyContent:"space-between",alignItems:"center",
    padding:"14px 16px",border:"1px solid #e2e8f0",borderRadius:12,background:"#fafafa",
    flexWrap:"wrap",gap:8},
  editBtn:{background:"#e0f2fe",color:"#0369a1",border:"none",borderRadius:8,
    padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"},
  delBtn:{background:"#fee2e2",color:"#991b1b",border:"none",borderRadius:8,
    padding:"6px 10px",fontSize:14,cursor:"pointer"},
  secTitle:{fontSize:15,fontWeight:800,marginBottom:14,color:"#1e293b"},
  statsGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12},
  statItem:{background:"#f8fafc",borderRadius:12,padding:14,border:"1px solid #e2e8f0"},
  sRow:{display:"flex",justifyContent:"space-between",fontSize:13,color:"#374151",marginTop:6},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:1000,padding:16},
  modalBox:{background:"#fff",borderRadius:16,padding:28,width:"100%",maxWidth:460,
    boxShadow:"0 20px 60px rgba(0,0,0,0.2)",maxHeight:"90vh",overflowY:"auto"},
  modalTitle:{fontSize:18,fontWeight:800,marginBottom:20,color:"#1e293b"},
  fg:{marginBottom:14},
  fl:{display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:6},
  input:{width:"100%",padding:"9px 12px",border:"1px solid #e2e8f0",borderRadius:8,
    fontSize:14,outline:"none",background:"#f8fafc",boxSizing:"border-box"},
  primaryBtn:{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",
    borderRadius:10,padding:"10px 24px",fontSize:14,fontWeight:700,cursor:"pointer",
    boxShadow:"0 2px 8px rgba(99,102,241,0.3)"},
  closeBtn:{background:"#f1f5f9",color:"#374151",border:"none",borderRadius:10,
    padding:"10px 20px",fontSize:14,fontWeight:600,cursor:"pointer"},
  toast:{position:"fixed",top:20,right:20,zIndex:9999,color:"#fff",padding:"12px 20px",
    borderRadius:12,fontSize:13,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",maxWidth:360},
  code:{fontSize:11,background:"#e2e8f0",padding:"1px 6px",borderRadius:4,fontFamily:"monospace"},
  empty:{color:"#9ca3af",textAlign:"center",padding:"20px 0",fontSize:13},
};

