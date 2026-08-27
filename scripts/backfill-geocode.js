/**
 * 回填已有记录的经纬度（高德逆地理编码）
 * 用法: node scripts/backfill-geocode.js
 */

// 加载 .env.local 中的 ENCRYPTION_KEY（不覆盖已有的环境变量）
const fs = require("fs");
const path = require("path");
try {
  const envLocal = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
  for (const line of envLocal.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m && m[1] === "ENCRYPTION_KEY" && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim();
    }
  }
} catch {}

const { PrismaClient } = require("@prisma/client");
const { createDecipheriv } = require("crypto");
const prisma = new PrismaClient();

const AMAP_GEO_URL = "https://restapi.amap.com/v3/geocode/geo";

function decrypt(encryptedData) {
  if (!encryptedData || !encryptedData.includes(":")) return encryptedData;
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) return encryptedData;
  const key = Buffer.from(keyHex, "hex");
  const [ivHex, authTagHex, encryptedHex] = encryptedData.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) return encryptedData;
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

async function getAmapKey() {
  const setting = await prisma.settings.findUnique({ where: { key: "ai_configs" } });
  if (!setting?.value) return null;
  const configs = JSON.parse(setting.value);
  const amap = configs.find((c) => c.id === "amap");
  if (!amap?.apiKey) return null;
  return decrypt(amap.apiKey);
}

/**
 * 清洗地址：去除楼栋、楼层、门牌号等过于详细的信息
 */
function cleanAddress(addr) {
  if (!addr) return "";
  let s = addr
    .replace(/\(.*?\)/g, "")        // 去括号内容 如 (深南中路)
    .replace(/（.*?）/g, "")        // 去中文括号
    .replace(/[·●].*$/, "")         // 去 · 后内容 如 ·西塔34楼3403A-DrayEasy
    .replace(/-\S+$/, "")           // 去 -X座/X室 等
    .replace(/\d+栋.*$/, "")        // 去 X栋 及之后
    .replace(/[A-Z]座.*$/, "")      // 去 A座 及之后
    .replace(/\d+座.*$/, "")        // 去 X座 及之后
    .replace(/\d+楼.*$/, "")        // 去 X楼 及之后
    .replace(/\d+层.*$/, "")        // 去 X层 及之后
    .replace(/\d+号.*$/, "")        // 去 X号 及之后
    .replace(/整层$/, "")
    .replace(/大厦$/, "")
    .replace(/大楼$/, "")
    .replace(/科研楼$/, "")
    .replace(/创意公园$/, "创意园")
    .replace(/(\d+)期/, "")         // 去 X期
    .trim();
  return s;
}

/**
 * 提取区+建筑名用于渐进搜索
 */
function extractDistrictAndBuilding(addr) {
  const m = addr.match(/(?:深圳|广州|北京|上海)?([一-龥]{2,4}(?:区|县))/);
  if (!m) return null;
  const district = m[1];
  const after = addr.substring(addr.indexOf(district) + district.length);
  // 去掉开头的"深圳"等城市名（地址内部的重复）
  const building = after.replace(/^(深圳|广州|北京|上海)/, "").trim();
  return { district, building: building.substring(0, 20) };
}

/**
 * 渐进式 geocode：先试完整地址，失败则逐步缩短
 */
async function geocodeSmart(addr, key) {
  // 尝试完整地址
  let geo = await geocode(addr, key);
  if (geo) return geo;

  // 清洗后重试
  const cleaned = cleanAddress(addr);
  if (cleaned !== addr) {
    geo = await geocode(cleaned, key);
    if (geo) return geo;
  }

  // 提取"区+建筑名"组合
  const info = extractDistrictAndBuilding(addr);
  if (info) {
    // 试"深圳+区+建筑名"
    if (info.building) {
      geo = await geocode(`深圳${info.district}${info.building}`, key);
      if (geo) return geo;
    }
    // 只试"深圳+区"
    geo = await geocode(`深圳${info.district}`, key);
    if (geo) return geo;
  }

  return null;
}

async function geocode(address, key) {
  const url = `${AMAP_GEO_URL}?address=${encodeURIComponent(address)}&key=${key}&output=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "1" || !data.geocodes?.length) return null;
  const [lng, lat] = data.geocodes[0].location.split(",").map(Number);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

async function main() {
  const key = await getAmapKey();
  if (!key) {
    console.error("❌ 未找到高德 API Key，请先在设置页配置");
    process.exit(1);
  }
  console.log("✅ 高德 Key 已加载");

  // 1. 回填 PreInterviewAnalysis
  const analyses = await prisma.preInterviewAnalysis.findMany({
    where: { workAddress: { not: null }, latitude: null },
    select: { id: true, companyName: true, workAddress: true },
  });
  console.log(`\n📋 PreInterviewAnalysis 待回填: ${analyses.length} 条`);
  let aUpdated = 0;
  for (const a of analyses) {
    const geo = await geocodeSmart(a.workAddress, key);
    if (geo) {
      await prisma.preInterviewAnalysis.update({
        where: { id: a.id },
        data: { latitude: geo.lat, longitude: geo.lng },
      });
      console.log(`  ✓ ${a.companyName} -> (${geo.lat}, ${geo.lng})`);
      aUpdated++;
    } else {
      console.log(`  ✗ ${a.companyName} (无法解析: ${a.workAddress})`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log(`  回填完成: ${aUpdated}/${analyses.length}`);

  // 2. 回填 UserProfile
  const profiles = await prisma.userProfile.findMany({
    where: { latitude: null },
    select: { userId: true, residence: true },
  });
  console.log(`\n👤 UserProfile 待回填: ${profiles.length} 条`);
  let pUpdated = 0;
  for (const p of profiles) {
    try {
      const residence = JSON.parse(p.residence || "{}");
      const address = residence.address || (residence.city ? `${residence.city}${residence.district || ""}` : "");
      if (!address) {
        console.log(`  ✗ ${p.userId} (无地址)`);
        continue;
      }
      const geo = await geocodeSmart(address, key);
      if (geo) {
        await prisma.userProfile.update({
          where: { userId: p.userId },
          data: { latitude: geo.lat, longitude: geo.lng },
        });
        console.log(`  ✓ ${address} -> (${geo.lat}, ${geo.lng})`);
        pUpdated++;
      } else {
        console.log(`  ✗ ${address} (无法解析)`);
      }
      await new Promise((r) => setTimeout(r, 250));
    } catch (e) {
      console.error(`  ✗ ${p.userId} 错误:`, e.message);
    }
  }
  console.log(`  回填完成: ${pUpdated}/${profiles.length}`);

  // 3. 回填驾车距离到 analysisResult
  const AMAP_DRIVING_URL = "https://restapi.amap.com/v3/direction/driving";
  const profile = await prisma.userProfile.findUnique({ where: { userId: "local" } });
  if (profile?.latitude && profile?.longitude) {
    const allAnalyses = await prisma.preInterviewAnalysis.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      select: { id: true, companyName: true, latitude: true, longitude: true, analysisResult: true },
    });
    console.log(`\n🚗 计算驾车距离: ${allAnalyses.length} 条`);
    let dUpdated = 0;
    for (const a of allAnalyses) {
      try {
        const result = JSON.parse(a.analysisResult || "{}");
        if (result.commuteInfo) continue; // 已有距离，跳过

        const origin = `${profile.longitude},${profile.latitude}`;
        const dest = `${a.longitude},${a.latitude}`;
        const url = `${AMAP_DRIVING_URL}?origin=${origin}&destination=${dest}&key=${key}&output=json`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === "1" && data.route?.paths?.length) {
          const path = data.route.paths[0];
          const distance = parseInt(path.distance, 10);
          const duration = parseInt(path.duration, 10);
          const km = (distance / 1000).toFixed(1);
          const mins = Math.round(duration / 60);
          let formatted;
          if (mins < 60) formatted = `${km}km / ${mins}分钟`;
          else formatted = `${km}km / ${Math.floor(mins / 60)}小时${mins % 60}分钟`;

          result.commuteInfo = { distance, duration, formatted };
          await prisma.preInterviewAnalysis.update({
            where: { id: a.id },
            data: { analysisResult: JSON.stringify(result) },
          });
          console.log(`  ✓ ${a.companyName} -> ${formatted}`);
          dUpdated++;
        } else {
          console.log(`  ✗ ${a.companyName} (路径规划失败: ${data.info})`);
        }
        await new Promise((r) => setTimeout(r, 250));
      } catch (e) {
        console.error(`  ✗ ${a.companyName} 错误:`, e.message);
      }
    }
    console.log(`  回填完成: ${dUpdated}/${allAnalyses.length}`);
  } else {
    console.log("\n⚠️ 未找到家庭地址坐标，跳过驾车距离计算");
  }

  await prisma.$disconnect();
  console.log("\n🎉 全部完成");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
