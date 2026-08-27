/**
 * 高德地图工具库
 * 逆地理编码 + 驾车路径规划
 */

import { prisma } from "@/lib/prisma";
import { decryptSafe } from "@/lib/crypto";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface DrivingResult {
  distance: number;  // 米
  duration: number;  // 秒
}

/**
 * 从数据库获取高德 API Key
 */
export async function getAmapKey(): Promise<string | null> {
  try {
    const configsSetting = await prisma.settings.findUnique({ where: { key: "ai_configs" } });
    if (!configsSetting?.value) return null;

    const configs = JSON.parse(configsSetting.value);
    const amapConfig = configs.find((c: any) => c.id === "amap");
    if (!amapConfig?.apiKey) return null;

    return decryptSafe(amapConfig.apiKey) || null;
  } catch {
    return null;
  }
}

/**
 * 高德逆地理编码：地址 → 经纬度
 * @param address 地址文本（如"深圳市南山区科技园"）
 * @param apiKey 高德 Web 服务 key
 * @returns 经纬度或 null
 */
export async function geocode(address: string, apiKey: string): Promise<GeoPoint | null> {
  try {
    const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${apiKey}&output=json`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "1" || !data.geocodes?.length) {
      console.warn("[amap] geocode failed:", data.info || "no results", "address:", address);
      return null;
    }

    const location: string = data.geocodes[0].location; // "lng,lat"
    const [lng, lat] = location.split(",").map(Number);
    if (isNaN(lat) || isNaN(lng)) return null;

    return { lat, lng };
  } catch (e: any) {
    console.error("[amap] geocode error:", e.message);
    return null;
  }
}

/**
 * 高德驾车路径规划
 * @param origin 起点坐标
 * @param destination 终点坐标
 * @param apiKey 高德 Web 服务 key
 * @returns 驾车距离和时长
 */
export async function drivingDistance(origin: GeoPoint, destination: GeoPoint, apiKey: string): Promise<DrivingResult | null> {
  try {
    const originStr = `${origin.lng},${origin.lat}`;
    const destStr = `${destination.lng},${destination.lat}`;
    const url = `https://restapi.amap.com/v3/direction/driving?origin=${originStr}&destination=${destStr}&key=${apiKey}&output=json`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "1" || !data.route?.paths?.length) {
      console.warn("[amap] driving distance failed:", data.info || "no route");
      return null;
    }

    const path = data.route.paths[0];
    return {
      distance: parseInt(path.distance, 10),  // 米
      duration: parseInt(path.duration, 10),   // 秒
    };
  } catch (e: any) {
    console.error("[amap] driving distance error:", e.message);
    return null;
  }
}

/**
 * 格式化驾车距离显示
 */
export function formatDrivingResult(result: DrivingResult): string {
  const km = (result.distance / 1000).toFixed(1);
  const mins = Math.round(result.duration / 60);
  if (mins < 60) return `${km}km / ${mins}分钟`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${km}km / ${h}小时${m}分钟`;
}
