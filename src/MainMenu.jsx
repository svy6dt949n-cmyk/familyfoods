import { useState } from "react";

export default function MainMenu({ onSelect }) {
  return (
    <div style={{ maxWidth: 420, margin: "0 auto", fontFamily: "system-ui, sans-serif", padding: "40px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 11, color: "#888", letterSpacing: 1, fontWeight: 600 }}>FAMILY FOODS</div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>勤怠管理システム</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <button
          onClick={() => onSelect("calendar")}
          style={{
            background: "#fff", border: "1.5px solid #D3D1C7", borderRadius: 18,
            padding: "28px 20px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 16,
          }}
        >
          <div style={{ fontSize: 36 }}>📅</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>カレンダー</div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>休暇・勤怠の確認と管理</div>
          </div>
        </button>

        <button
          onClick={() => onSelect("attendance")}
          style={{
            background: "#0F6E56", border: "none", borderRadius: 18,
            padding: "28px 20px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 16,
          }}
        >
          <div style={{ fontSize: 36 }}>📷</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>出退勤</div>
            <div style={{ fontSize: 13, color: "#9FE1CB", marginTop: 2 }}>QRスキャンで出勤・外出・退勤</div>
          </div>
        </button>
      </div>
    </div>
  );
}
