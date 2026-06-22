import { useState, useEffect, useRef } from "react";

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
  return res.json();
}

function getJST() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

function fmtTime(date) {
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  });
}

const ACTIONS = [
  { key: "clock_in",      label: "出勤",     icon: "🟢", color: "#0F6E56", bg: "#E1F5EE" },
  { key: "outside_start", label: "外出",     icon: "🟡", color: "#854F0B", bg: "#FAEEDA" },
  { key: "outside_end",   label: "外出戻り", icon: "🔵", color: "#185FA5", bg: "#E6F1FB" },
  { key: "clock_out",     label: "退勤",     icon: "🔴", color: "#A32D2D", bg: "#FCEBEB" },
];

export default function QRScan({ employee }) {
  const [phase, setPhase] = useState("idle");
  const [selectedAction, setSelectedAction] = useState(null);
  const [empStatus, setEmpStatus] = useState("none");
  const [history, setHistory] = useState([]);
  const [clock, setClock] = useState(fmtTime(getJST()));
  const [workplaces, setWorkplaces] = useState([]);
  const [selectedWP, setSelectedWP] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setClock(fmtTime(getJST())), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    sbFetch("workplaces?is_active=eq.true&select=*").then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setWorkplaces(data);
        setSelectedWP(data[0]);
      }
    });
  }, []);

  async function handleAction(actionKey) {
    if (!selectedWP) return;
    setSelectedAction(actionKey);
    setPhase("locating");
    await sleep(700);
    setPhase("processing");
    await sleep(500);

    const now = getJST();
    const workDate = now.toISOString().slice(0, 10);

    if (actionKey === "clock_in") {
      await sbFetch("attendance_records", {
        method: "POST",
        body: JSON.stringify({
          employee_id: employee?.id || 1,
          workplace_id: selectedWP.id,
          work_date: workDate,
          clock_in: now.toISOString(),
          status: "working",
        }),
      });
    } else if (actionKey === "clock_out") {
      await sbFetch(
        `attendance_records?employee_id=eq.${employee?.id || 1}&work_date=eq.${workDate}&status=eq.working`,
        {
          method: "PATCH",
          body: JSON.stringify({ clock_out: now.toISOString(), status: "done" }),
        }
      );
    }

    const nextStatus = {
      clock_in: "working",
      outside_start: "outside",
      outside_end: "working",
      clock_out: "off",
    }[actionKey];

    setEmpStatus(nextStatus);
    setHistory(h => [{ action: actionKey, time: fmtTime(now), wp: selectedWP.name }, ...h]);
    setPhase("success");
    timerRef.current = setTimeout(() => setPhase("idle"), 2500);
  }

  const statusLabel = {
    none: "未出勤", working: "出勤中",
    outside: "外出中", off: "退勤済み"
  };

  const actionMeta = key => ACTIONS.find(a => a.key === key);

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#0F6E56", padding: "20px 22px 18px", borderRadius: "0 0 22px 22px" }}>
        <div style={{ fontSize: 11, color: "#9FE1CB", letterSpacing: 1, fontWeight: 600 }}>FAMILY FOODS</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", marginTop: 4 }}>出退勤</div>
        <div style={{ fontSize: 42, fontWeight: 300, color: "#fff", marginTop: 12, letterSpacing: 3 }}>{clock}</div>
        <div style={{ fontSize: 11, color: "#9FE1CB" }}>JST (Asia/Tokyo)</div>
        <div style={{ marginTop: 12, display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 16px", fontSize: 13, color: "#fff", fontWeight: 600 }}>
          {statusLabel[empStatus]}
        </div>
      </div>

      <div style={{ padding: "18px 18px 0" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#5F5E5A", fontWeight: 600, marginBottom: 6 }}>勤務地</div>
          <select
            value={selectedWP?.id || ""}
            onChange={e => setSelectedWP(workplaces.find(w => w.id === e.target.value))}
            style={{ width: "100%", padding: "12px 16px", fontSize: 15, border: "1.5px solid #D3D1C7", borderRadius: 12 }}
          >
            {workplaces.map(wp => <option key={wp.id} value={wp.id}>{wp.name}</option>)}
          </select>
        </div>

        {phase === "idle" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            {ACTIONS.map(a => (
              <button
                key={a.key}
                onClick={() => handleAction(a.key)}
                style={{
                  background: a.bg, border: "none", borderRadius: 16,
                  padding: "24px 12px", cursor: "pointer", textAlign: "center",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{a.icon}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: a.color }}>{a.label}</div>
              </button>
            ))}
          </div>
        )}

        {(phase === "locating" || phase === "processing") && (
          <div style={{ background: "#F1EFE8", borderRadius: 20, padding: "30px 18px", textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {phase === "locating" ? "📍" : "⚙️"}
            </div>
            <div style={{ fontSize: 16, color: "#5F5E5A" }}>
              {phase === "locating" ? "位置確認中..." : "処理中..."}
            </div>
          </div>
        )}

        {phase === "success" && (
          <div style={{ background: actionMeta(selectedAction)?.bg, borderRadius: 20, padding: "30px 18px", textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 56 }}>{actionMeta(selectedAction)?.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: actionMeta(selectedAction)?.color, marginTop: 8 }}>
              {actionMeta(selectedAction)?.label}
            </div>
            <div style={{ fontSize: 28, marginTop: 8 }}>{clock}</div>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#5F5E5A", marginBottom: 10 }}>本日の記録</div>
            {history.map((rec, i) => {
              const meta = actionMeta(rec.action);
              return (
                <div key={i} style={{ background: "#fff", border: "1px solid #D3D1C7", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: meta?.color }}>{meta?.icon} {meta?.label}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{rec.wp}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{rec.time}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }``