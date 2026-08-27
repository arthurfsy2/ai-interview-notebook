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

    // 2. 公司地址标记（只取有面试记录的）
    const analyses = await prisma.preInterviewAnalysis.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        linkedInterviewId: { not: null },
      },
      select: {
        id: true,
        companyName: true,
        workAddress: true,
        latitude: true,
        longitude: true,
        analysisResult: true,
        interview: { select: { result: true, interviewDate: true } },
      },
    });

    const seen = new Set<string>();
    for (const a of analyses) {
      const key = `${a.latitude},${a.longitude}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let commuteInfo: any = null;
      try {
        const result = JSON.parse(a.analysisResult || "{}");
        commuteInfo = result.commuteInfo;
      } catch {}

      markers.push({
        id: a.id,
        type: "company",
        name: a.companyName,
        address: a.workAddress || undefined,
        lat: a.latitude,
        lng: a.longitude,
        distance: commuteInfo?.distance,
        duration: commuteInfo?.duration,
        formattedDistance: commuteInfo?.formatted,
        result: a.interview?.result,
        interviewDate: a.interview?.interviewDate?.toISOString(),
      });
    }

    // 3. 高德 JS API Key
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
