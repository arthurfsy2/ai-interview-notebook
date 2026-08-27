"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ArrowLeft, MapPin, Home, Building2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface MapMarker {
  id: string;
  type: "home" | "company";
  name: string;
  address?: string;
  lat: number;
  lng: number;
  distance?: number;
  duration?: number;
  formattedDistance?: string;
  result?: string;
  interviewDate?: string;
}

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string };
    AMap: any;
    AMapLoader: any;
  }
}

const resultColors: Record<string, string> = {
  "通过": "bg-emerald-100 text-emerald-700",
  "被拒": "bg-red-100 text-red-700",
  "主动放弃": "bg-slate-100 text-slate-700",
  "无消息": "bg-amber-100 text-amber-700",
  "待定": "bg-blue-100 text-blue-700",
};

export default function MapPage() {
  const t = useTranslations("Navigation");
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    fetch("/api/map")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMarkers(d.data.markers);
          if (d.data.jsApiKey) {
            initMap(d.data.jsApiKey, d.data.markers);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const initMap = async (apiKey: string, markerData: MapMarker[]) => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      // Load Amap JS API
      if (!window.AMap) {
        const script = document.createElement("script");
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}`;
        script.onload = () => renderMap(markerData);
        document.head.appendChild(script);
      } else {
        renderMap(markerData);
      }
    } catch (e) {
      console.error("Failed to load Amap:", e);
    }
  };

  const renderMap = (markerData: MapMarker[]) => {
    if (!window.AMap || !mapRef.current) return;

    const map = new window.AMap.Map(mapRef.current, {
      zoom: 12,
      center: [114.05, 22.55], // 深圳 default
      mapStyle: "amap://styles/whitesmoke",
    });

    const amapMarkers: any[] = [];

    for (const m of markerData) {
      const isHome = m.type === "home";
      const content = isHome
        ? '<div style="background:#3b82f6;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:12px;">🏠</span></div>'
        : '<div style="background:#ef4444;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:12px;">🏢</span></div>';

      const marker = new window.AMap.Marker({
        position: [m.lng, m.lat],
        content,
        offset: new window.AMap.Pixel(-12, -12),
        extData: m,
      });

      marker.on("click", () => {
        setSelectedMarker(m);
      });

      amapMarkers.push(marker);
    }

    map.add(amapMarkers);

    // Fit view to show all markers
    if (amapMarkers.length > 0) {
      map.setFitView(amapMarkers, false, [60, 60, 60, 60]);
    }

    mapInstanceRef.current = map;
    setMapReady(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-700">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">面试地图</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Home className="h-3 w-3" /> 家</span>
            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> 公司</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-slate-400">加载地图数据...</p>
          </div>
        ) : markers.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">暂无地图数据</p>
              <p className="text-xs text-slate-400">完成投前分析后，公司地址会自动标注在地图上</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Map Container */}
            <Card className="mb-4 overflow-hidden">
              <div ref={mapRef} className="w-full h-[400px]" />
            </Card>

            {/* Selected Marker Detail */}
            {selectedMarker && (
              <Card className="mb-4 border-blue-200 bg-blue-50/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {selectedMarker.type === "home" ? (
                          <Home className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Building2 className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-semibold text-slate-900">{selectedMarker.name}</span>
                        {selectedMarker.result && (
                          <Badge className={`text-xs ${resultColors[selectedMarker.result] || ""}`}>
                            {selectedMarker.result}
                          </Badge>
                        )}
                      </div>
                      {selectedMarker.address && (
                        <p className="text-xs text-slate-500 mb-1">📍 {selectedMarker.address}</p>
                      )}
                      {selectedMarker.formattedDistance && (
                        <p className="text-xs text-blue-600">🚗 {selectedMarker.formattedDistance}</p>
                      )}
                      {selectedMarker.interviewDate && (
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(selectedMarker.interviewDate).toLocaleDateString("zh-CN")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedMarker(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  {selectedMarker.type === "company" && selectedMarker.id !== "home" && (
                    <button
                      onClick={() => router.push(`/pre-interview/${selectedMarker.id}`)}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >
                      查看投前分析报告 →
                    </button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Marker List */}
            <div className="space-y-2">
              {markers.filter((m) => m.type === "company").map((m) => (
                <Card
                  key={m.id}
                  className="cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
                  onClick={() => {
                    setSelectedMarker(m);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.setCenter([m.lng, m.lat]);
                      mapInstanceRef.current.setZoom(15);
                    }
                  }}
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-red-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{m.name}</p>
                        {m.address && <p className="text-xs text-slate-400">{m.address}</p>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {m.formattedDistance && (
                        <p className="text-xs text-blue-600">🚗 {m.formattedDistance}</p>
                      )}
                      {m.result && (
                        <Badge className={`text-xs mt-1 ${resultColors[m.result] || ""}`}>
                          {m.result}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
