"use client";
import { useEffect, useRef } from "react";

const BG = "#0F1A0F", TEXT = "#F0FFF0", RED_DIM = "#3C0A0A", RED = "#F87171", GREEN = "#4ADE80", G_DIM = "#081F10", MUTED = "#527A5C";

export default function MapPicker({ nome, initialLat, initialLng, onSelect, onClose }: {
  nome: string;
  initialLat?: number | null;
  initialLng?: number | null;
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
}) {
  const mapRef       = useRef<HTMLDivElement>(null);
  const markerRef    = useRef<any>(null);
  const mapInstRef   = useRef<any>(null);
  const selectedRef  = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    import("leaflet").then(L => {
      const lat = initialLat ?? -21.5;
      const lng = initialLng ?? -54.0;

      const map = (L as any).map(mapRef.current!).setView([lat, lng], initialLat ? 13 : 7);
      mapInstRef.current = map;

      (L as any).tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      if (initialLat && initialLng) {
        markerRef.current = (L as any).marker([lat, lng]).addTo(map);
      }

      map.on("click", (e: any) => {
        const { lat: la, lng: lo } = e.latlng;
        const roundLat = parseFloat(la.toFixed(6));
        const roundLng = parseFloat(lo.toFixed(6));
        if (markerRef.current) {
          markerRef.current.setLatLng([roundLat, roundLng]);
        } else {
          markerRef.current = (L as any).marker([roundLat, roundLng]).addTo(map);
        }
        selectedRef.current = { lat: roundLat, lng: roundLng };
        const btn = document.getElementById("map-confirm-btn");
        if (btn) { btn.removeAttribute("disabled"); btn.style.opacity = "1"; }
      });
    });

    return () => { if (mapInstRef.current) mapInstRef.current.remove(); };
  }, []);

  function confirmar() {
    if (selectedRef.current) {
      onSelect(selectedRef.current.lat, selectedRef.current.lng);
      onClose();
    }
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:70, background:"rgba(0,0,0,0.95)", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", background: BG, borderBottom:"1px solid #1F2F1F", gap:12, flexShrink:0 }}>
        <div>
          <p style={{ color: TEXT, fontSize:14, fontWeight:700 }}>{nome}</p>
          <p style={{ color: MUTED, fontSize:12, marginTop:2 }}>Clique no mapa para marcar a localização</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button id="map-confirm-btn" onClick={confirmar} disabled style={{
            padding:"8px 18px", borderRadius:8, fontSize:14, fontWeight:700,
            background: G_DIM, color: GREEN, border:`1px solid #3C6244`,
            cursor:"pointer", opacity:0.4,
          }}>Confirmar</button>
          <button onClick={onClose} style={{
            padding:"8px 14px", borderRadius:8, fontSize:14, fontWeight:600,
            background: RED_DIM, color: RED, border:"none", cursor:"pointer",
          }}>Fechar</button>
        </div>
      </div>
      <div ref={mapRef} style={{ flex:1 }} />
    </div>
  );
}
