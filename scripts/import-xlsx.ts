/**
 * 从 Excel 文件导入面试记录到数据库
 * 用法：npx tsx scripts/import-xlsx.ts <xlsx文件路径>
 */
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";

const prisma = new PrismaClient();

const RESULT_MAP: Record<string, string> = {
  "被拒": "被拒",
  "无消息": "无消息",
  "主动拒": "主动放弃",
  "待定": "待定",
};

const EXPERIENCE_MAP: Record<string, number> = {
  "体验很差": 1,
  "体验中等偏下": 2,
  "体验中等": 3,
  "体验比较不错": 4,
  "体验很好": 5,
};

async function main() {
  const filePath = process.argv[2] || path.resolve(__dirname, "../../面试记录/面试记录2026.xlsx");

  console.log(`Reading: ${filePath}`);
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<any>(ws);

  console.log(`Found ${data.length} records`);

  for (const row of data) {
    const companyName = row["公司"]?.trim() || "";
    const interviewMode = row["面试方式"]?.trim() || "线下";
    const position = row["面试岗位"]?.trim() || "";
    const interviewDateStr = row["面试时间"]?.trim() || "";
    const experienceStr = row["评价"]?.trim() || "";
    const resultStr = row["结果"]?.trim() || "待定";
    const notes = row["备注"]?.trim() || "";

    if (!companyName) {
      console.log("Skipping empty row");
      continue;
    }

    // Parse date
    let interviewDate = new Date();
    try {
      const parts = interviewDateStr.split(/[\s.]+/);
      if (parts.length >= 3) {
        interviewDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
      }
    } catch {
      // use today
    }

    const existing = await prisma.interview.findFirst({
      where: { companyName, position },
    });

    if (existing) {
      console.log(`Skipping duplicate: ${companyName} - ${position}`);
      continue;
    }

    await prisma.interview.create({
      data: {
        companyName,
        position,
        interviewDate,
        interviewMode: interviewMode.includes("线上") && interviewMode.includes("线下") ? "混合" : interviewMode.includes("线上") ? "线上" : "线下",
        result: RESULT_MAP[resultStr] || "待定",
        experienceRating: EXPERIENCE_MAP[experienceStr] || 3,
        rounds: interviewMode.match(/(\d+)轮/) ? parseInt(interviewMode.match(/(\d+)轮/)![1]) : 1,
        notes,
      },
    });

    console.log(`Imported: ${companyName} - ${position}`);
  }

  console.log("Import completed!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Import failed:", e);
  prisma.$disconnect();
  process.exit(1);
});
