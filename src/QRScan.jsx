import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

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

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const ACTIONS = [
  { key: "clock_in",      label: "出勤",     icon: "🟢", color: "#0F6E56", bg: "#E1F5EE" },
  { key: "outside_start", label: "外出",     icon: "🟡", color: "#854F0B", bg: "#FAEEDA" },
  { key: "outside_end",   label: "外出戻り", icon: "🔵", color: "#185FA5", bg: "#E6F1FB" },
  { key: "clock_out",     label: "退勤",     icon: "🔴", color: "#A32D2D", bg: "#FCEBEB" },
];

function QRScanner({ onScan, onCancel }) {
  const html5QrRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // DOM이 마운트된 후 약간 딜레이를 주고 시작
    const timer = setTimeout(() => {
      if (startedRef.current) return;
      startedRef.current = true;

      const scanner = new Html5Qrcode("qr-reader-box");
      html5QrRef.current = scanner;

      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().then(() => onScan(decodedText)).catch(() => onScan(decodedText));
        },
        () => {}
      ).catch((err) => {
        console.error("카메라 시작 실패:", err);
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 2000,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        📷 QRコードをスキャン
      </div>
      <div style={{ color: "#9FE1CB", fontSize: 13, marginBottom: 24 }}>
        カメラをQRコードに向けてください
      </div>
      <div
        id="qr-reader-box"
        style={{ width: 300, height: 300, borderRadius: 16, overflow: "hidden", background: "#111" }}
      />
      <button
        onClick={() => {
          if (html5QrRef.current) html5QrRef.current.stop().catch(() => {});
          onCancel();
        }}
        style={{
          marginTop: 32, background: "#fff", border: "none", borderRadius: 12,
          padding: "12px 40px", fontSize: 16, fontWeight: 700, cursor: "pointer", color: "#333"
        }}
      >
        キャンセル
      </button>
    </div>
  );
}

export default function QRScan({ employee }) {
  const [phase, setPhase] = useState("idle");
  const [selectedAction, setSelectedAction] = useState(null);
  const [empStatus, setEmpStatus] = useState("none");
  const [history, setHistory] = useState([]);
  const [clock, setClock] = useState(fmtTime(getJST()));
  const [workplaces, setWorkplaces] = useState([]);
  const [selectedWP, setSelectedWP] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

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

  function handleAction(actionKey) {
    if (!selectedWP) return;
    setSelectedAction(actionKey);
    setPhase("scanning");
  }

  async function handleQRSuccess(qrText) {
    setPhase("locating");

    // QR 값이 근무지 id(UUID)와 일치하는지 확인
    if (qrText.trim() !== selectedWP.qr_code?.trim()) {
      setErrorMsg(`QRコードが一致しません。\n正しい ${selectedWP.name} のQRコードをスキャンしてください。`);
      setPhase("error");
      return;
    }

    // GPS 취득
    try {
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
        })
      );

      const { latitude, longitude } = position.coords;

      if (false && selectedWP.latitude && selectedWP.longitude) {
        const distance = calcDistance(latitude, longitude, selectedWP.latitude, selectedWP.longitude);
        const allowed = selectedWP.radius || 500;

        if (distance > allowed) {
          setErrorMsg(`現在地が ${selectedWP.name} から ${distance}m 離れています。\n${allowed}m 以内で打刻してください。`);
          setPhase("error");
          return;
        }
      }

      setPhase("processing");
      await processAttendance(selectedAction, latitude, longitude);

    } catch {
      setErrorMsg("GPS位置の取得に失敗しました。\n位置情報の許可を確認してください。");
      setPhase("error");
    }
  }

  async function processAttendance(actionKey, lat, lng) {
    const now = getJST();
    const workDate = now.toISOString().slice(0, 10);

    try {
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
          { method: "PATCH", body: JSON.stringify({ clock_out: now.toISOString(), status: "done" }) }
        );
      }

      setEmpStatus({ clock_in: "working", outside_start: "outside", outside_end: "working", clock_out: "off" }[actionKey]);
      setHistory(h => [{ action: actionKey, time: fmtTime(now), wp: selectedWP.name }, ...h]);
      setPhase("success");
      setTimeout(() => setPhase("idle"), 3000);

    } catch {
      setErrorMsg("記録の保存に失敗しました。もう一度お試しください。");
      setPhase("error");
    }
  }

  const statusLabel = { none: "未出勤", working: "出勤中", outside: "外出中", off: "退勤済み" };
  const actionMeta = key => ACTIONS.find(a => a.key === key);

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>

      {phase === "scanning" && (
        <QRScanner onScan={handleQRSuccess} onCancel={() => setPhase("idle")} />
      )}

      {/* 헤더 */}
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
        {/* 근무지 선택 */}
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

        {/* 버튼 4개 */}
        {phase === "idle" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            {ACTIONS.map(a => (
              <button key={a.key} onClick={() => handleAction(a.key)}
                style={{ background: a.bg, border: "none", borderRadius: 16, padding: "24px 12px", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{a.icon}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: a.color }}>{a.label}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>QRスキャン</div>
              </button>
            ))}
          </div>
        )}

        {/* GPS 확인 중 */}
        {phase === "locating" && (
          <div style={{ background: "#F1EFE8", borderRadius: 20, padding: "30px 18px", textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📍</div>
            <div style={{ fontSize: 16, color: "#5F5E5A", fontWeight: 600 }}>GPS位置確認中...</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>現在地を確認しています</div>
          </div>
        )}

        {/* 처리 중 */}
        {phase === "processing" && (
          <div style={{ background: "#F1EFE8", borderRadius: 20, padding: "30px 18px", textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚙️</div>
            <div style={{ fontSize: 16, color: "#5F5E5A", fontWeight: 600 }}>処理中...</div>
          </div>
        )}

        {/* 성공 */}
        {phase === "success" && (
          <div style={{ background: actionMeta(selectedAction)?.bg, borderRadius: 20, padding: "30px 18px", textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 56 }}>{actionMeta(selectedAction)?.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: actionMeta(selectedAction)?.color, marginTop: 8 }}>
              {actionMeta(selectedAction)?.label} 完了
            </div>
            <div style={{ fontSize: 28, marginTop: 8 }}>{clock}</div>
            <div style={{ fontSize: 13, color: "#666", marginTop: 8 }}>{selectedWP?.name}</div>
          </div>
        )}

        {/* 에러 */}
        {phase === "error" && (
          <div style={{ background: "#FCEBEB", borderRadius: 20, padding: "24px 18px", textAlign: "center", marginBottom: 14, border: "1.5px solid #f87171" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 14, color: "#A32D2D", fontWeight: 600, lineHeight: 1.8, whiteSpace: "pre-line" }}>{errorMsg}</div>
            <button onClick={() => { setPhase("idle"); setErrorMsg(""); }}
              style={{ marginTop: 16, background: "#A32D2D", color: "#fff", border: "none", borderRadius: 10, padding: "10px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              もう一度試す
            </button>
          </div>
        )}

        {/* 오늘 기록 */}
        {history.length > 0 && phase !== "scanning" && (
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

