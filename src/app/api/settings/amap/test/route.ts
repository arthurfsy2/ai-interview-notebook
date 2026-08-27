import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSafe } from "@/lib/crypto";

/**
 * POST /api/settings/amap/test
 * 测试高德地图 API Key 连通性（逆地理编码）
 */
export async function POST(request: Request) {
  try {
    const { apiKey: rawApiKey } = await request.json();

    let apiKey = rawApiKey;

    // 前端未传 apiKey 时，从数据库读取已保存的 key
    if (!apiKey) {
      const configsSetting = await prisma.settings.findUnique({
        where: { key: "ai_configs" },
      });
      if (configsSetting?.value) {
        const configs = JSON.parse(configsSetting.value);
        const stored = configs.find((c: any) => c.id === "amap");
        if (stored?.apiKey) {
          apiKey = decryptSafe(stored.apiKey);
        }
      }
    }

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "API Key 不能为空",
      });
    }

    // 用逆地理编码测试连通性（固定用天安门坐标测试）
    const testUrl = `https://restapi.amap.com/v3/geocode/geo?address=天安门&key=${apiKey}&output=json`;

    const debug = {
      requestUrl: "https://restapi.amap.com/v3/geocode/geo?address=天安门&key=***&output=json",
      provider: "高德地图",
      apiKeyMasked: apiKey ? `${apiKey.substring(0, 6)}...${apiKey.slice(-4)}` : "(empty)",
    };
    const startTime = Date.now();

    console.log("[Amap Test]", debug);

    let fetchResponse: Response;
    try {
      fetchResponse = await fetch(testUrl);
    } catch (fetchErr: any) {
      return NextResponse.json({
        success: false,
        error: `请求发送失败: ${fetchErr.message}`,
        debug,
      });
    }

    const responseTime = Date.now() - startTime;
    const data = await fetchResponse.json();

    if (data.status !== "1") {
      return NextResponse.json({
        success: false,
        error: `高德 API 错误: ${data.info || "unknown"} (infocode: ${data.infocode || "unknown"})`,
        debug: { ...debug, responseTime: `${responseTime}ms`, info: data.info, infocode: data.infocode },
      });
    }

    const location = data.geocodes?.[0]?.location || "";
    return NextResponse.json({
      success: true,
      message: `连接成功（${responseTime}ms），逆地理编码正常`,
      debug: { ...debug, responseTime: `${responseTime}ms`, testLocation: location },
    });
  } catch (error: any) {
    console.error("[Amap Test] error:", error.message);
    return NextResponse.json({
      success: false,
      error: error.message || "连接失败",
    });
  }
}
