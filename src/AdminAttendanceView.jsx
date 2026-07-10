import { useState, useEffect } from "react";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPA_KEY,
      "Authorization": `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

function fmtTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tokyo",
  });
}

function mapLink(lat, lng) {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function nextMonthStart(ym) {
  const [y, m] = ym.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

const STATUS_META = {
  working: { ja: "出勤中", ko: "근무중", bg: "#dcfce7", tc: "#166534" },
  outside: { ja: "外出中", ko: "외출중", bg: "#fef3c7", tc: "#92400e" },
  done:    { ja: "退勤済", ko: "퇴근완료", bg: "#f1f5f9", tc: "#475569" },
};

export default function AdminAttendanceView({ lang, t, employees }) {
  const [mode, setMode] = useState("date"); // date | employee
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [empId, setEmpId] = useState(employees[0]?.id || "");
  const [ym, setYm] = useState(() => new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState("");

  const SELECT = "*,employees(name,name_ko),workplaces(name),outside_logs(*)";

  async function loadByDate(d) {
    setLoading(true); setError("");
    try {
      const rows = await sbFetch(`attendance_records?select=${SELECT}&work_date=eq.${d}&order=clock_in`);
      setRecords(rows);
    } catch (e) { setError(String(e.message || e)); setRecords([]); }
    finally { setLoading(false); }
  }

  async function loadByEmployee(id, ymVal) {
    setLoading(true); setError("");
    try {
      const from = `${ymVal}-01`;
      const to = nextMonthStart(ymVal);
      const rows = await sbFetch(
        `attendance_records?select=${SELECT}&employee_id=eq.${id}&work_date=gte.${from}&work_date=lt.${to}&order=work_date`
      );
      setRecords(rows);
    } catch (e) { setError(String(e.message || e)); setRecords([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (mode === "date") loadByDate(date); }, [mode, date]);
  useEffect(() => { if (mode === "employee" && empId) loadByEmployee(empId, ym); }, [mode, empId, ym]);

  function empName(rec) {
    const e = rec.employees;
    if (!e) return `ID:${rec.employee_id}`;
    return lang === "ja" ? e.name : (e.name_ko || e.name);
  }

  return (
    <div style={S.wrap}>
      <div style={S.tabBar}>
        <button style={{ ...S.tab, ...(mode === "date" ? S.tabOn : {}) }} onClick={() => setMode("date")}>
          {t("📅 日付別", "📅 날짜별")}
        </button>
        <button style={{ ...S.tab, ...(mode === "employee" ? S.tabOn : {}) }} onClick={() => setMode("employee")}>
          {t("👤 社員別", "👤 직원별")}
        </button>
      </div>

      <div style={S.filterRow}>
        {mode === "date" ? (
          <input type="date" style={S.input} value={date} onChange={e => setDate(e.target.value)} />
        ) : (
          <>
            <select style={S.input} value={empId} onChange={e => setEmpId(+e.target.value)}>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{lang === "ja" ? e.name : e.name_ko}</option>
              ))}
            </select>
            <input type="month" style={S.input} value={ym} onChange={e => setYm(e.target.value)} />
          </>
        )}
      </div>

      {loading && <div style={S.empty}>{t("読み込み中...", "불러오는 중...")}</div>}
      {error && <div style={{ ...S.empty, color: "#ef4444" }}>⚠ {error}</div>}
      {!loading && !error && records.length === 0 && (
        <div style={S.empty}>{t("記録がありません", "기록이 없습니다")}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {records.map(rec => {
          const st = STATUS_META[rec.status] || STATUS_META.done;
          const isOpen = expanded === rec.id;
          const outLogs = rec.outside_logs || [];
          const inLink = mapLink(rec.clock_in_lat, rec.clock_in_lng);
          const outLink = mapLink(rec.clock_out_lat, rec.clock_out_lng);
          return (
            <div key={rec.id} style={S.card}>
              <div style={S.cardHead} onClick={() => setExpanded(isOpen ? null : rec.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{empName(rec)}</span>
                  {mode === "employee" && <span style={{ fontSize: 12, color: "#6b7280" }}>{rec.work_date}</span>}
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{rec.workplaces?.name || "-"}</span>
                  <span style={{ ...S.pill, background: st.bg, color: st.tc }}>{lang === "ja" ? st.ja : st.ko}</span>
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>{isOpen ? "▲" : "▼"}</div>
              </div>

              <div style={S.timeRow}>
                <TimeBlock label={t("出勤", "출근")} time={fmtTime(rec.clock_in)} link={inLink} />
                <TimeBlock label={t("退勤", "퇴근")} time={fmtTime(rec.clock_out)} link={outLink} />
                <div style={S.timeBlock}>
                  <div style={S.timeLabel}>{t("外出合計", "외출합계")}</div>
                  <div style={S.timeVal}>{rec.outside_minutes || 0}{t("分", "분")}</div>
                </div>
              </div>

              {isOpen && (
                <div style={S.detail}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                    {t("外出・戻り履歴", "외출·복귀 기록")} ({outLogs.length}{t("件", "건")})
                  </div>
                  {outLogs.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{t("外出記録なし", "외출 기록 없음")}</div>
                  ) : (
                    outLogs.map(log => {
                      const outL = mapLink(log.out_lat, log.out_lng);
                      const inL = mapLink(log.in_lat, log.in_lng);
                      return (
                        <div key={log.id} style={S.outLogRow}>
                          <span>🟡 {t("外出", "외출")} {fmtTime(log.out_at)}{" "}
                            {outL && <a href={outL} target="_blank" rel="noreferrer" style={S.mapA}>📍</a>}
                          </span>
                          <span>🔵 {t("戻り", "복귀")} {fmtTime(log.in_at)}{" "}
                            {inL && <a href={inL} target="_blank" rel="noreferrer" style={S.mapA}>📍</a>}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeBlock({ label, time, link }) {
  return (
    <div style={S.timeBlock}>
      <div style={S.timeLabel}>{label}</div>
      <div style={S.timeVal}>
        {time}{" "}
        {link && <a href={link} target="_blank" rel="noreferrer" style={S.mapA}>📍</a>}
      </div>
    </div>
  );
}

const S = {
  wrap: { background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  tabBar: { display: "flex", gap: 6, marginBottom: 14 },
  tab: { padding: "8px 16px", border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 10,
    fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" },
  tabOn: { background: "#6366f1", color: "#fff", borderColor: "#6366f1" },
  filterRow: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  input: { padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc" },
  empty: { color: "#9ca3af", textAlign: "center", padding: "24px 0", fontSize: 13 },
  card: { border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#fafafa" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 14px", cursor: "pointer", background: "#fff" },
  pill: { fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8 },
  timeRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "10px 14px" },
  timeBlock: { textAlign: "center" },
  timeLabel: { fontSize: 11, color: "#9ca3af" },
  timeVal: { fontSize: 14, fontWeight: 700, color: "#1e293b", marginTop: 2 },
  mapA: { textDecoration: "none", fontSize: 12 },
  detail: { borderTop: "1px solid #e2e8f0", padding: "10px 14px", background: "#fff" },
  outLogRow: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#374151",
    padding: "6px 0", borderBottom: "1px dashed #e2e8f0" },
};

