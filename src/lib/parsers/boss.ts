/**
 * BOSS直聘 JD 解析器
 * 从粘贴的原始文本中提取结构化信息
 */

export interface BossParsed {
  /** 检测结果 */
  detected: boolean;
  /** 岗位名称 */
  position: string;
  /** 公司全称（工商注册名） */
  companyName: string;
  /** 公司显示名（BOSS 展示名） */
  companyDisplayName: string;
  /** 薪资范围 */
  salary: string;
  /** 工作城市 */
  location: string;
  /** 经验要求 */
  experience: string;
  /** 学历要求 */
  education: string;
  /** 公司规模 */
  companySize: string;
  /** 融资/上市状态 */
  listingStatus: string;
  /** 所属行业 */
  industry: string;
  /** 福利标签 */
  benefits: string[];
  /** 清理后的 JD 正文（职位描述部分） */
  jdText: string;
  /** 公司介绍 */
  companyIntro: string;
  /** 工作地址（从 BOSS JD 提取） */
  workAddress: string;
}

/**
 * 检测是否为 BOSS直聘格式
 */
function isBossFormat(text: string): boolean {
  return /BOSS直聘|BOSS\s*安全提示|竞争力分析|感兴趣\s*继续沟通/.test(text);
}

/**
 * 清理 HTML 实体和多余空白
 */
function clean(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 提取第一个匹配组
 */
function match1(text: string, pattern: RegExp): string {
  const m = text.match(pattern);
  return m ? clean(m[1]) : "";
}

export function parseBossJD(raw: string): BossParsed {
  const result: BossParsed = {
    detected: false,
    position: "",
    companyName: "",
    companyDisplayName: "",
    salary: "",
    location: "",
    experience: "",
    education: "",
    companySize: "",
    listingStatus: "",
    industry: "",
    benefits: [],
    jdText: "",
    companyIntro: "",
    workAddress: "",
  };

  if (!isBossFormat(raw)) return result;
  result.detected = true;

  // 1. 岗位名称 + 薪资：匹配 "职位名 薪资" 格式，跳过 BOSS 标签如"招聘中"
  // 格式: "AI产品经理（周末双休+提供住宿） 25-35K" 或 "系统分析师 10-15K·13薪"
  const titleMatch = raw.match(/(?:招聘中|最新)\s*\n\s*([^\n\d]+?)\s+(\d+[-~]\d+[Kk]·?\d*\s*薪?)/);
  if (titleMatch) {
    result.position = clean(titleMatch[1]);
    result.salary = clean(titleMatch[2]);
  } else {
    // Fallback: match first line with salary pattern after position name
    const fallback = raw.match(/([一-龥a-zA-Z()（）+]+(?:周末双休[+])?(?:提供住宿)?)\s+(\d+[-~]\d+[Kk][·\d]*\s*薪?)/);
    if (fallback) {
      result.position = clean(fallback[1]);
      result.salary = clean(fallback[2]);
    }
  }

  // 2. 城市 + 经验 + 学历
  const locationMatch = raw.match(/([一-龥]+)\s+(\d+[-~]\d+年|经验不限|应届生|在校生)\s*(本科|大专|硕士|博士|学历不限)?/m);
  if (locationMatch) {
    result.location = clean(locationMatch[1]);
    result.experience = clean(locationMatch[2]);
    result.education = clean(locationMatch[3] || "");
  }

  // 3. 公司基本信息块 — 公司名在这里
  const infoBlock = raw.match(/公司基本信息\s*\n+([\s\S]*?)(?=查看全部职位|职位描述)/);
  if (infoBlock) {
    const infoText = infoBlock[1];
    // 公司名是第一行非空内容（显示名，如"华杰电商"）
    const nameMatch = infoText.match(/^\s*([一-龥a-zA-Z()（）]+)/m);
    if (nameMatch && !/查看全部/.test(nameMatch[1])) {
      result.companyDisplayName = clean(nameMatch[1]);
      result.companyName = clean(nameMatch[1]);
    }
    result.listingStatus = match1(infoText, /(已上市|未上市|已融资|不需要融资|A轮|B轮|C轮|D轮|天使轮)/);
    result.companySize = match1(infoText, /(\d+人以上|\d+-\d+人|少于\d+人)/);
    result.industry = match1(infoText, /([一-龥]+\/[一-龥]+)/);
  }

  // 4. 工商信息块 — 取全称（如"深圳市华杰科技有限公司"），覆盖简称
  const bizInfo = raw.match(/工商信息\s*\n+公司名称\s*\n+([^\n]+)/);
  if (bizInfo) {
    result.companyName = clean(bizInfo[1]);
  }

  // 如果都没匹配到，兼容旧格式
  if (!result.companyName) {
    const companyMatch = raw.match(/感兴趣\s*继续沟通\s*\n+(?:完善在线简历[^\n]*\n+)?\s*[.]{3}[^\n]*\n+\s*公司基本信息\s*\n+\s*([一-龥a-zA-Z()（）]+)/);
    if (companyMatch) result.companyName = clean(companyMatch[1]);
  }

  // 5. 福利标签
  const benefitsMatch = raw.match(/\.\.\.([一-龥]+)/);
  if (benefitsMatch) {
    const benefitStr = benefitsMatch[1];
    // BOSS福利是以每个词连续排列的，按常见福利词分割
    const knownBenefits = [
      "五险一金", "定期体检", "加班补助", "年终奖", "带薪年假",
      "员工旅游", "通讯补贴", "节日福利", "零食下午茶", "餐补",
      "交通补助", "住房补贴", "股票期权", "补充医疗保险", "免费班车",
      "包吃", "包住", "全勤奖", "绩效奖金", "工龄奖",
      "内购优惠", "员工培训", "员工激励",
    ];
    for (const b of knownBenefits) {
      if (benefitStr.includes(b)) result.benefits.push(b);
    }
  }

  // 6. JD 正文
  const jdMatch = raw.match(/职位描述\s*\n+([\s\S]*?)(?=公司介绍|BOSS\s*安全提示|竞争力分析|工作地址|查看全部|唐女士|黄女士|\n\n\n)/);
  if (jdMatch) {
    result.jdText = clean(jdMatch[1]);
  } else {
    // Fallback: 职位描述 to end of meaningful content
    const fallback = raw.match(/职位描述\s*\n+([\s\S]*?)(?=BOSS\s*安全提示|\n\n\n\n)/);
    if (fallback) result.jdText = clean(fallback[1]);
  }

  // 7. 公司介绍
  const introMatch = raw.match(/公司介绍\s*\n+([\s\S]*?)(?=工商信息|查看全部|BOSS\s*安全提示)/);
  if (introMatch) {
    result.companyIntro = clean(introMatch[1]).substring(0, 1000);
  }

  // 8. 工作地址
  const addrMatch = raw.match(/工作地址\s*\n+([^\n]+(?:\n[^\n]+)?)/);
  if (addrMatch) {
    result.workAddress = clean(addrMatch[1]);
  }

  return result;
}
