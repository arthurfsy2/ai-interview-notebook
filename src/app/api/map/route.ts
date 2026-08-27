import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSafe } from "@/lib/crypto";

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

/**
 * GET /api/map
 * 返回地图标记数据 + 高德 JS API Key
 * 以面试记录为主，通过公司名匹配投前分析获取经纬度
 */
export async function GET() {
  try {
    const markers: MapMarker[] = [];

    // 1. 家庭地址标记
    const profile = await prisma.userProfile.findUnique({ where: { userId: "local" } });
    if (profile?.latitude && profile?.longitude) {
      let homeName = "家";
      try {
        const residence = JSON.parse(profile.residence || "{}");
        homeName = residence.address || residence.city || "家";
      } catch {}
      markers.push({
        id: "home",
        type: "home",
        name: homeName,
        lat: profile.latitude,
        lng: profile.longitude,
      });
    }

    // 2. 所有有经纬度的投前分析（建索引：公司名 → 坐标+距离）
    const geocodedAnalyses = await prisma.preInterviewAnalysis.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      select: {
        companyName: true,
        workAddress: true,
        latitude: true,
        longitude: true,
        analysisResult: true,
      },
    });
    const geoByCompany = new Map<string, typeof geocodedAnalyses[0]>();
    for (const a of geocodedAnalyses) {
      if (!geoByCompany.has(a.companyName)) {
        geoByCompany.set(a.companyName, a);
      }
    }

    // 3. 面试记录 → 匹配经纬度
    const interviews = await prisma.interview.findMany({
      select: {
        id: true,
        companyName: true,
        result: true,
        interviewDate: true,
      },
      orderBy: { interviewDate: "desc" },
    });

    const seen = new Set<string>();
    for (const iv of interviews) {
      const geo = geoByCompany.get(iv.companyName);
      if (!geo) continue; // 没有经纬度的跳过

      const key = `${geo.latitude},${geo.longitude}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let commuteInfo: any = null;
      try {
        const result = JSON.parse(geo.analysisResult || "{}");
        commuteInfo = result.commuteInfo;
      } catch {}

      markers.push({
        id: iv.id,
        type: "company",
        name: iv.companyName,
        address: geo.workAddress || undefined,
        lat: geo.latitude,
        lng: geo.longitude,
        distance: commuteInfo?.distance,
        duration: commuteInfo?.duration,
        formattedDistance: commuteInfo?.formatted,
        result: iv.result,
        interviewDate: iv.interviewDate?.toISOString(),
      });
    }

    // 4. 高德 JS API Key
    let jsApiKey = "";
    try {
      const configsSetting = await prisma.settings.findUnique({ where: { key: "ai_configs" } });
      if (configsSetting?.value) {
        const configs = JSON.parse(configsSetting.value);
        const amapConfig = configs.find((c: any) => c.id === "amap");
        if (amapConfig?.apiKey) {
          jsApiKey = decryptSafe(amapConfig.apiKey);
        }
      }
    } catch {}

    return NextResponse.json({
      success: true,
      data: { markers, jsApiKey },
    });
  } catch (error: any) {
    console.error("[map] GET error:", error);
    return NextResponse.json({ error: "获取地图数据失败" }, { status: 500 });
  }
}
