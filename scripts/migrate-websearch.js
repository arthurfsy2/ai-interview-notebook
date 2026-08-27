/**
 * 迁移 WebSearch 配置到独立存储
 * 从 ai_configs 数组中提取 websearch 记录，写入 websearch_config
 */

const { PrismaClient } = require("@prisma/client");
const { createDecipheriv, createCipheriv, randomBytes } = require("crypto");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

function getEncryptionKey() {
  try {
    const envLocal = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
    const match = envLocal.match(/ENCRYPTION_KEY=([a-f0-9]+)/);
    if (match) return Buffer.from(match[1], "hex");
  } catch {}
  return null;
}

function decrypt(data, key) {
  if (!data || !data.includes(":") || !key) return data;
  try {
    const [ivHex, authTagHex, encryptedHex] = data.split(":");
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
  } catch {
    return data;
  }
}

function encrypt(text, key) {
  if (!text || !key) return text;
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

async function main() {
  const encKey = getEncryptionKey();

  // 1. 检查是否已有 websearch_config
  const existing = await prisma.settings.findUnique({ where: { key: "websearch_config" } });
  if (existing) {
    console.log("✅ websearch_config 已存在，跳过迁移");
    const config = JSON.parse(existing.value);
    console.log(`  Provider: ${config.provider}, HasKey: ${!!config.apiKey}`);
    await prisma.$disconnect();
    return;
  }

  // 2. 从 ai_configs 中查找 websearch
  const configsSetting = await prisma.settings.findUnique({ where: { key: "ai_configs" } });
  if (!configsSetting?.value) {
    console.log("❌ 未找到 ai_configs");
    await prisma.$disconnect();
    return;
  }

  const configs = JSON.parse(configsSetting.value);
  const wsConfig = configs.find((c) => c.id === "websearch");
  if (!wsConfig?.apiKey) {
    console.log("❌ ai_configs 中未找到 websearch 配置");
    await prisma.$disconnect();
    return;
  }

  // 3. 解密 key 并推断 provider
  const decryptedKey = decrypt(wsConfig.apiKey, encKey);
  let provider = "tavily";
  if (decryptedKey.startsWith("tvly-")) provider = "tavily";
  else if (decryptedKey.startsWith("exa-")) provider = "exa";

  // 4. 重新加密并保存到 websearch_config
  const reEncryptedKey = encKey ? encrypt(decryptedKey, encKey) : wsConfig.apiKey;
  await prisma.settings.create({
    data: {
      key: "websearch_config",
      value: JSON.stringify({ provider, apiKey: reEncryptedKey }),
    },
  });

  console.log("✅ 迁移完成");
  console.log(`  Provider: ${provider}`);
  console.log(`  Key: ${decryptedKey.substring(0, 8)}...`);

  // 5. 从 ai_configs 中移除 websearch 记录
  const updatedConfigs = configs.filter((c) => c.id !== "websearch");
  await prisma.settings.update({
    where: { key: "ai_configs" },
    data: { value: JSON.stringify(updatedConfigs) },
  });
  console.log("✅ 已从 ai_configs 中移除 websearch 记录");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
