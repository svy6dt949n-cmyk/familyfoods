import { useState, useEffect } from "react";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
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

function fmtTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tokyo",
  });
}

// datetime-local input용: "2026-07-10T09:00" 형태로 변환 (JST 기준)
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const jst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const pad = n => String(n).padStart(2, "0");
  return `${jst.getFullYear()}-${pad(jst.getMonth() + 1)}-${pad(jst.getDate())}T${pad(jst.getHours())}:${pad(jst.getMinutes())}`;
}

// datetime-local 입력값(JST 기준 로컬시간) -> UTC ISO 문자열로 변환
function fromLocalInput(dateStr) {
  if (!dateStr) return null;
  const [datePart, timePart] = dateStr.split("T");
  const isoGuess = `${datePart}T${timePart}:00+09:00`;
  return new Date(isoGuess).toISOString();
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
  const [mode, setMode] = useState("date");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [empId, setEmpId] = useState(employees[0]?.id || "");
  const [ym, setYm] = useState(() => new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState("");
  const [editRec, setEditRec] = useState(null);   // 수정 모달 대상
  const [addOpen, setAddOpen] = useState(false);  // 수동추가 모달

  const SELECT = "*,employees(name,name_ko),workplaces(name),outside_logs(*)";

  useEffect(() => {
    sbFetch("workplaces?select=id,name").then(setWorkplaces).catch(() => {});
  }, []);

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

  function reload() {
    if (mode === "date") loadByDate(date);
    else if (empId) loadByEmployee(empId, ym);
  }

  useEffect(() => { reload(); }, [mode, date, empId, ym]);

  function empName(rec) {
    const e = rec.employees;
    if (!e) return `ID:${rec.employee_id}`;
    return lang === "ja" ? e.name : (e.name_ko || e.name);
  }

  async function handleDelete(rec) {
    if (!window.confirm(t("この記録を削除しますか？", "이 기록을 삭제할까요?"))) return;
    try {
      await sbFetch(`attendance_records?id=eq.${rec.id}`, { method: "DELETE" });
      reload();
    } catch (e) { alert(t("削除に失敗しました: ", "삭제 실패: ") + e.message); }
  }

  async function handleDeleteOutsideLog(logId) {
    if (!window.confirm(t("この外出記録を削除しますか？", "이 외출 기록을 삭제할까요?"))) return;
    try {
      await sbFetch(`outside_logs?id=eq.${logId}`, { method: "DELETE" });
      reload();
    } catch (e) { alert(t("削除に失敗しました: ", "삭제 실패: ") + e.message); }
  }

  function downloadCSV() {
    if (records.length === 0) { alert(t("記録がありません", "기록이 없습니다")); return; }
    const rows = [
      ["日付", "氏名", "勤務地", "出勤", "退勤", "外出合計(分)", "状態"],
      ...records.map(rec => [
        rec.work_date,
        empName(rec),
        rec.workplaces?.name || "",
        fmtTime(rec.clock_in),
        fmtTime(rec.clock_out),
        rec.outside_minutes || 0,
        (STATUS_META[rec.status] || STATUS_META.done)[lang],
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const label = mode === "date" ? date : `${empName(records[0])}_${ym}`;
    a.download = `attendance_${label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <div style={{ flex: 1 }} />
        <button style={S.csvBtn} onClick={downloadCSV}>
          ⬇ {t("CSV出力", "CSV출력")}
        </button>
        <button style={S.addBtn} onClick={() => setAddOpen(true)}>
          + {t("手動追加", "수동추가")}
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button style={S.smallBtn} onClick={e => { e.stopPropagation(); setEditRec(rec); }}>
                    ✏️ {t("修正", "수정")}
                  </button>
                  <button style={{ ...S.smallBtn, background: "#fee2e2", color: "#991b1b" }}
                    onClick={e => { e.stopPropagation(); handleDelete(rec); }}>
                    🗑
                  </button>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{isOpen ? "▲" : "▼"}</span>
                </div>
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
                          <button style={{ ...S.smallBtn, background: "#fee2e2", color: "#991b1b", padding: "2px 8px" }}
                            onClick={() => handleDeleteOutsideLog(log.id)}>🗑</button>
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

      {editRec && (
        <EditModal t={t} lang={lang} rec={editRec} workplaces={workplaces}
          onClose={() => setEditRec(null)}
          onSaved={() => { setEditRec(null); reload(); }} />
      )}

      {addOpen && (
        <AddModal t={t} lang={lang} employees={employees} workplaces={workplaces}
          defaultDate={mode === "date" ? date : undefined}
          defaultEmpId={mode === "employee" ? empId : undefined}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); reload(); }} />
      )}
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

// ── 기록 수정 모달 ──────────────────────────────────────────
function EditModal({ t, lang, rec, workplaces, onClose, onSaved }) {
  const [workplaceId, setWorkplaceId] = useState(rec.workplace_id || "");
  const [clockIn, setClockIn] = useState(toLocalInput(rec.clock_in));
  const [clockOut, setClockOut] = useState(toLocalInput(rec.clock_out));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSave() {
    setSaving(true); setErr("");
    try {
      const body = {
        workplace_id: workplaceId,
        clock_in: clockIn ? fromLocalInput(clockIn) : null,
        clock_out: clockOut ? fromLocalInput(clockOut) : null,
        status: clockOut ? "done" : "working",
      };
      await sbFetch(`attendance_records?id=eq.${rec.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <h3 style={S.modalTitle}>✏️ {t("記録を修正", "기록 수정")}</h3>
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14 }}>{rec.work_date}</div>

        <Field label={t("勤務地", "근무지")}>
          <select style={S.input} value={workplaceId} onChange={e => setWorkplaceId(e.target.value)}>
            {workplaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label={t("出勤時刻", "출근시각")}>
          <input type="datetime-local" style={S.input} value={clockIn} onChange={e => setClockIn(e.target.value)} />
        </Field>
        <Field label={t("退勤時刻", "퇴근시각")}>
          <input type="datetime-local" style={S.input} value={clockOut} onChange={e => setClockOut(e.target.value)} />
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            {t("空欄にすると「未退勤」になります", "비워두면 '미퇴근' 상태가 됩니다")}
          </div>
        </Field>

        {err && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>⚠ {err}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button style={S.primaryBtn} onClick={handleSave} disabled={saving}>
            {saving ? t("保存中...", "저장 중...") : t("保存", "저장")}
          </button>
          <button style={S.closeBtn} onClick={onClose}>{t("キャンセル", "취소")}</button>
        </div>
      </div>
    </div>
  );
}

// ── 수동으로 새 기록 추가 모달 ──────────────────────────────
function AddModal({ t, lang, employees, workplaces, defaultDate, defaultEmpId, onClose, onSaved }) {
  const initDate = defaultDate || new Date().toISOString().slice(0, 10);
  const [empId, setEmpId] = useState(defaultEmpId || employees[0]?.id || "");
  const [workDate, setWorkDate] = useState(initDate);
  const [workplaceId, setWorkplaceId] = useState(workplaces[0]?.id || "");
  const [clockIn, setClockIn] = useState(`${initDate}T09:00`);
  const [clockOut, setClockOut] = useState(`${initDate}T18:00`);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSave() {
    if (!empId || !workDate || !workplaceId) { setErr(t("すべて選択してください", "모두 선택해주세요")); return; }
    setSaving(true); setErr("");
    try {
      await sbFetch("attendance_records", {
        method: "POST",
        body: JSON.stringify({
          employee_id: empId,
          workplace_id: workplaceId,
          work_date: workDate,
          clock_in: clockIn ? fromLocalInput(clockIn) : null,
          clock_out: clockOut ? fromLocalInput(clockOut) : null,
          status: clockOut ? "done" : "working",
        }),
      });
      onSaved();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <h3 style={S.modalTitle}>📅 {t("出勤記録を手動追加", "출퇴근 기록 수동 추가")}</h3>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>
          {t("スマホを忘れた等、打刻できなかった場合に使用します", "휴대폰을 안 가져온 경우 등, 체크인을 못한 경우에 사용하세요")}
        </div>

        <Field label={t("社員", "직원")}>
          <select style={S.input} value={empId} onChange={e => setEmpId(+e.target.value)}>
            {employees.map(e => <option key={e.id} value={e.id}>{lang === "ja" ? e.name : e.name_ko}</option>)}
          </select>
        </Field>
        <Field label={t("日付", "날짜")}>
          <input type="date" style={S.input} value={workDate} onChange={e => setWorkDate(e.target.value)} />
        </Field>
        <Field label={t("勤務地", "근무지")}>
          <select style={S.input} value={workplaceId} onChange={e => setWorkplaceId(e.target.value)}>
            {workplaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label={t("出勤時刻", "출근시각")}>
          <input type="datetime-local" style={S.input} value={clockIn} onChange={e => setClockIn(e.target.value)} />
        </Field>
        <Field label={t("退勤時刻", "퇴근시각")}>
          <input type="datetime-local" style={S.input} value={clockOut} onChange={e => setClockOut(e.target.value)} />
        </Field>

        {err && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>⚠ {err}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button style={S.primaryBtn} onClick={handleSave} disabled={saving}>
            {saving ? t("保存中...", "저장 중...") : t("追加する", "추가하기")}
          </button>
          <button style={S.closeBtn} onClick={onClose}>{t("キャンセル", "취소")}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const S = {
  wrap: { background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  tabBar: { display: "flex", gap: 6, marginBottom: 14, alignItems: "center" },
  tab: { padding: "8px 16px", border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 10,
    fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" },
  tabOn: { background: "#6366f1", color: "#fff", borderColor: "#6366f1" },
  addBtn: { padding: "8px 16px", border: "none", background: "linear-gradient(135deg,#059669,#10b981)",
    color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  csvBtn: { padding: "8px 16px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#374151",
    borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  filterRow: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  input: { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13,
    background: "#f8fafc", boxSizing: "border-box" },
  empty: { color: "#9ca3af", textAlign: "center", padding: "24px 0", fontSize: 13 },
  card: { border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#fafafa" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 14px", cursor: "pointer", background: "#fff" },
  pill: { fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8 },
  smallBtn: { background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: 6,
    padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  timeRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "10px 14px" },
  timeBlock: { textAlign: "center" },
  timeLabel: { fontSize: 11, color: "#9ca3af" },
  timeVal: { fontSize: 14, fontWeight: 700, color: "#1e293b", marginTop: 2 },
  mapA: { textDecoration: "none", fontSize: 12 },
  detail: { borderTop: "1px solid #e2e8f0", padding: "10px 14px", background: "#fff" },
  outLogRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#374151",
    padding: "6px 0", borderBottom: "1px dashed #e2e8f0", gap: 8 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal: { background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420,
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { fontSize: 17, fontWeight: 800, marginBottom: 6, color: "#1e293b" },
  primaryBtn: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", flex: 1 },
  closeBtn: { background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 10,
    padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
};

