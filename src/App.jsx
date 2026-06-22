import { useState } from "react";
import QRScan from "./QRScan";
import MainMenu from "./MainMenu";

export default function App() {
  const [page, setPage] = useState("menu");

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