import { useState } from "react";
import QRScan from "./QRScan";
import MainMenu from "./MainMenu";

<<<<<<< HEAD
export default function App() {
  const [page, setPage] = useState("menu");

=======
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
const APP_VER="2.1";

// 색상 정의
const COLOR = {
  sentaku: { bg:"#d1fae5", text:"#065f46", border:"#6ee7b7", label:"選択休暇", labelKo:"선택휴무" },
  yukyu:   { bg:"#dbeafe", text:"#1e40af", border:"#93c5fd", label:"有給休暇", labelKo:"유급휴가" },
  half:    { bg:"#e0e7ff", text:"#3730a3", border:"#a5b4fc", label:"半休",     labelKo:"반차" },
  daitai:  { bg:"#fce7f3", text:"#9d174d", border:"#f9a8d4", label:"代替休暇", labelKo:"대체휴가" },
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
  const [submitting,setSubmitting]=useState(false);
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
    if(submitting) return;
    if(!date){showToast(t("日付を選択","날짜 선택"),"error");return;}
    if(isOff(date)){showToast(t("公休日・日曜は申請不可","공휴일·일요일 신청 불가"),"error");return;}
    if(requests.find(r=>r.emp_id===empId&&r.date===date)){showToast(t("既に申請済み","이미 신청함"),"error");return;}
    setSubmitting(true);
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
    finally{setSubmitting(false);}
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
  // 반려 후 2일 지나면 자동 숨김
  function isExpiredRejected(r){
    if(r.status!=="rejected") return false;
    const created=new Date(r.created_at||r.date);
    const twoDaysAgo=new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate()-2);
    return created<twoDaysAgo;
  }
  const visibleRequests=requests.filter(r=>!isExpiredRejected(r));
  const getApproved=(ds)=>visibleRequests.filter(r=>r.date===ds&&r.status==="approved");
  const getAllForDate=(ds)=>visibleRequests.filter(r=>r.date===ds);
  const getMyReq=(empId,ds)=>visibleRequests.find(r=>r.emp_id===empId&&r.date===ds);
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
  if(req.type==="代替休暇") return {bg:COLOR.daitai.bg,text:COLOR.daitai.text};
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
function EmployeeView({lang,t,currentUser,employees,requests,year,month,prevMonth,nextMonth,
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

                  </div>
                </div>
                {/* 본인 신청 표시 */}
                {my&&(()=>{
                  const cs=getChipStyle(my);
                  return (
                    <div style={{...S.chip,background:cs.bg,color:cs.text,border:`1px solid ${cs.bg}`,fontWeight:800}}>
                      ★{my.type==="選択休暇"?t("選休","선택"):my.half?t("半休","반차"):t("有給","유급")}
                    </div>
                  );
                })()}
                {/* 다른 직원 이름 표시 */}
                {appr.filter(r=>r.emp_id!==currentUser.id).slice(0,2).map(r=>{
                  const emp=employees.find(a=>a.id===r.emp_id);
                  const cs=getChipStyle(r);
                  const dispName=(lang==="ja"?emp?.name:emp?.name_ko)||"";
                  return (
                    <div key={r.id} style={{...S.chip,background:cs.bg,color:cs.text,fontSize:9,marginTop:2}}>
                      {dispName.replace(/　/g," ").trim()}{r.half?t("半","반"):""}
                    </div>
                  );
                })}
                {appr.filter(r=>r.emp_id!==currentUser.id).length>2&&(
                  <div style={{...S.chip,background:"#f1f5f9",color:"#475569",fontSize:9,marginTop:2,fontWeight:700}}>
                    {t("他","외")+String(appr.filter(r=>r.emp_id!==currentUser.id).length-2)+t("名","명")}
                  </div>
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
  downloadCSV,pendingList,addEmployee,updateEmployee,deleteEmployee,resetPassword,loadData}){
  const [tab,setTab]=useState("calendar");
  const [filter,setFilter]=useState("all");
  const [dayModal,setDayModal]=useState(null);
  const [adminAddModal,setAdminAddModal]=useState(null); // {date} 관리자 직접 지정
  const [editReqModal,setEditReqModal]=useState(null); // 기존 신청 변경
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
              {bg:COLOR.daitai.bg,tc:COLOR.daitai.text,label:t("代替休暇","대체휴가")},
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

                  minHeight:90,cursor:isOff(ds)?"default":"pointer"}}
                  onClick={()=>!isOff(ds)&&setDayModal({date:ds,reqs:all})}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span style={{...S.dayNum,...dayColor(ds)}}>{dn}</span>
                    <div style={{display:"flex",gap:2,alignItems:"center"}}>
                      {isHoliday(ds)&&<span style={S.holTag}>{JP_HOLIDAYS[ds]?.slice(0,2)}</span>}
                      {w&&<span style={{fontSize:11}}>⚠️</span>}
                    </div>
                  </div>
                  {/* 승인된 직원 이름 표시 */}
                  {appr.slice(0,2).map(r=>{
                    const emp=employees.find(a=>a.id===r.emp_id);
                    const cs=getChipStyle(r);
                    const rawName=(lang==="ja"?emp?.name:emp?.name_ko)||"";
                    const dispName=rawName.replace(/[　\s]+/g," ").trim();
                    return (
                      <div key={r.id} style={{...S.chip,background:cs.bg,color:cs.text,
                        border:`1px solid ${cs.bg}`,fontSize:10,marginTop:2}}>
                        {dispName}{r.half?t("半","반"):""}
                      </div>
                    );
                  })}
                  {appr.length>2&&(
                    <div style={{...S.chip,background:"#f1f5f9",color:"#475569",fontSize:10,marginTop:2,fontWeight:700}}>
                      {t(`他${appr.length-2}名`,`외${appr.length-2}명`)}
                    </div>
                  )}
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
                await db.addRequest({...r,status:"approved"});
                if(r.type==="有給休暇"){
                  const emp=employees.find(e=>e.id===r.emp_id);
                  const dec=r.half?0.5:1;
                  const newLeave=Math.max(0,(emp?.remaining_paid_leave||0)-dec);
                  await db.updateEmployee(r.emp_id,{remaining_paid_leave:newLeave});
                }
                window.location.reload();
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
                window.location.reload();
              }catch(e){alert("エラー: "+e.message);}
            }}
            onUpdateLeave={async(empId,newLeave)=>{
              try{
                await db.updateEmployee(empId,{remaining_paid_leave:Number(newLeave)});
                window.location.reload();
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
                  <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                    {r.status==="pending"&&<>
                      <button style={S.approveBtn} onClick={()=>{approve(r.id);setDayModal(null);}}>✓ {t("承認","승인")}</button>
                      <button style={S.rejectBtn} onClick={()=>{reject(r.id);setDayModal(null);}}>✕ {t("却下","반려")}</button>
                    </>}
                    <button style={{...S.editBtn,background:"#fef9c3",color:"#854d0e"}}
                      onClick={()=>{setEditReqModal(r);setDayModal(null);}}>
                      ✏️ {t("変更","변경")}
                    </button>
                    <button style={S.rejectBtn}
                      onClick={async()=>{
                        if(!window.confirm(t("本当に削除しますか？","정말 삭제할까요?"))) return;
                        try{
                          await db.deleteRequest(r.id);
                          if(r.status==="approved"&&r.type==="有給休暇"){
                            const emp=employees.find(e=>e.id===r.emp_id);
                            const newLeave=(emp?.remaining_paid_leave||0)+(r.half?0.5:1);
                            await db.updateEmployee(r.emp_id,{remaining_paid_leave:newLeave});
                          }
                          window.location.reload();
                        }catch(e){alert("エラー: "+e.message);}
                      }}>
                      🗑 {t("削除","삭제")}
                    </button>
                  </div>
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
                  window.location.reload();
                  setAdminAddModal(null);
                  showToast(t("直接指定しました","직접 지정 완료"));
                }catch(e){showToast("エラー: "+e.message,"error");}
              }}
              onClose={()=>setAdminAddModal(null)}
            />
          </div>
        </div>
      )}
      {/* 기존 신청 변경 모달 */}
      {editReqModal&&(
        <div style={S.overlay} onClick={()=>setEditReqModal(null)}>
          <div style={{...S.modalBox,maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <h3 style={S.modalTitle}>✏️ {t("休暇を変更","휴가 변경")}</h3>
            <EditReqForm
              t={t} req={editReqModal}
              employees={employees}
              onSave={async(newType,newDate,newHalf)=>{
                try{
                  // 기존 유급이면 복원
                  if(editReqModal.status==="approved"&&editReqModal.type==="有給休暇"){
                    const emp=employees.find(e=>e.id===editReqModal.emp_id);
                    const restore=(editReqModal.half?0.5:1);
                    await db.updateEmployee(editReqModal.emp_id,{remaining_paid_leave:(emp?.remaining_paid_leave||0)+restore});
                  }
                  // 새로 저장
                  await db.updateRequest(editReqModal.id,{type:newType,date:newDate,half:newHalf});
                  // 새 유급이면 차감
                  if(editReqModal.status==="approved"&&newType==="有給休暇"){
                    const emp=employees.find(e=>e.id===editReqModal.emp_id);
                    const dec=newHalf?0.5:1;
                    await db.updateEmployee(editReqModal.emp_id,{remaining_paid_leave:Math.max(0,(emp?.remaining_paid_leave||0)-dec)});
                  }
                  window.location.reload();
                }catch(e){showToast("エラー: "+e.message,"error");}
              }}
              onClose={()=>setEditReqModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 신청 변경 폼
// ══════════════════════════════════════════════════════════════════
function EditReqForm({t,req,employees,onSave,onClose}){
  const emp=employees.find(e=>e.id===req.emp_id);
  const [type,setType]=useState(req.type);
  const [date,setDate]=useState(req.date);
  const [half,setHalf]=useState(req.half||false);
>>>>>>> daa00167076c77a04e6c612fbca31fe7ea4e2e45
  return (
    <div>
      {page === "menu" && <MainMenu onSelect={setPage} />}

      {page === "attendance" && (
        <div>
          <button
            onClick={() => setPage("menu")}
            style={{ margin: 16, padding: "8px 16px", border: "1px solid #D3D1C7", borderRadius: 10, background: "#fff", cursor: "pointer" }}
          >
            ← メニューに戻る
          </button>
          <QRScan employee={{ id: 1 }} />
        </div>
      )}

      {page === "calendar" && (
        <div style={{ padding: 40, textAlign: "center" }}>
          <button
            onClick={() => setPage("menu")}
            style={{ margin: 16, padding: "8px 16px", border: "1px solid #D3D1C7", borderRadius: 10, background: "#fff", cursor: "pointer" }}
          >
            ← メニューに戻る
          </button>
          <div style={{ fontSize: 18, color: "#888" }}>カレンダー機能は準備中です</div>
        </div>
      )}
    </div>
  );
}