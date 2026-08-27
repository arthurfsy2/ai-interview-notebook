import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { geocode, getAmapKey } from "@/lib/amap";

export async function GET() {
  try {
    const profile = await prisma.userProfile.findUnique({ where: { userId: "local" } });
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error("[profile] GET error:", error);
    return NextResponse.json({ error: "获取档案失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const profile = await prisma.userProfile.upsert({
      where: { userId: "local" },
      update: {
        resumeText: body.resumeText,
        currentTitle: body.currentTitle,
        yearsOfExperience: body.yearsOfExperience || 0,
        targetTitle: body.targetTitle,
        targetIndustry: JSON.stringify(body.targetIndustry || []),
        currentSalary: JSON.stringify(body.currentSalary || {}),
        location: body.location,
        priorities: JSON.stringify(body.priorities || []),
        residence: JSON.stringify(body.residence || {}),
      },
      create: {
        userId: "local",
        resumeText: body.resumeText || "",
        currentTitle: body.currentTitle || "",
        yearsOfExperience: body.yearsOfExperience || 0,
        targetTitle: body.targetTitle || "",
        targetIndustry: JSON.stringify(body.targetIndustry || []),
        currentSalary: JSON.stringify(body.currentSalary || {}),
        location: body.location || "",
        priorities: JSON.stringify(body.priorities || []),
        residence: JSON.stringify(body.residence || {}),
      },
    });

    // Geocode residence address if available
    try {
      const residence = body.residence;
      const address = residence?.address || (residence?.city ? `${residence.city}${residence.district || ""}` : "");
      if (address) {
        const amapKey = await getAmapKey();
        if (amapKey) {
          const geo = await geocode(address, amapKey);
          if (geo) {
            await prisma.userProfile.update({
              where: { userId: "local" },
              data: { latitude: geo.lat, longitude: geo.lng },
            });
            console.log("[profile] Geocoded residence:", address, "->", geo);
          }
        }
      }
    } catch (e) {
      console.error("[profile] Geocode error:", e);
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error("[profile] POST error:", error);
    return NextResponse.json({ error: "保存档案失败" }, { status: 500 });
  }
}
