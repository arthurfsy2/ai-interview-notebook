/**
 * 猎聘 JD 解析器
 * 从粘贴的原始文本中提取结构化信息
 */

export interface LiepinParsed {
  /** 检测结果 */
  detected: boolean;
  /** 岗位名称 */
  position: string;
  /** 公司全称 */
  companyName: string;
  /** 薪资范围 */
  salary: string;
  /** 工作城市+区域 */
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
  /** 工作地址 */
  workAddress: string;
  /** 清理后的 JD 正文 */
  jdText: string;
  /** 公司介绍 */
  companyIntro: string;
}

/**
 * 检测是否为猎聘格式
 */
function isLiepinFormat(text: string): boolean {
  return /猎聘|继续聊.*9小时前|查看全部\s*猎聘温馨提示|企业行业：/.test(text);
}

/**
 * 清理空白
 */
function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * 提取第一个匹配组
 */
function match1(text: string, pattern: RegExp): string {
  const m = text.match(pattern);
  return m ? clean(m[1]) : "";
}

export function parseLiepinJD(raw: string): LiepinParsed {
  const result: LiepinParsed = {
    detected: false,
    position: "",
    companyName: "",
    salary: "",
    location: "",
    experience: "",
    education: "",
    companySize: "",
    listingStatus: "",
    industry: "",
    workAddress: "",
    jdText: "",
    companyIntro: "",
  };

  if (!isLiepinFormat(raw)) return result;
  result.detected = true;

  // 1. 岗位名称 + 薪资：格式 "XX有新消息\n岗位名\n15-22k·13薪"
  const titleMatch = raw.match(/\d+有新消息\s*\n\s*([^\n\d]{2,20})\n\s*(\d+[-~]\d+[Kk]·?\d*\s*薪?)/);
  if (titleMatch) {
    result.position = clean(titleMatch[1]);
    result.salary = clean(titleMatch[2]);
  } else {
    // Fallback: 匹配独立行的 "岗位名\n薪资"
    const fallback = raw.match(/\n([一-龥a-zA-Z()（）+]{2,20})\n(\d+[-~]\d+[Kk][·\d]*\s*薪?)/);
    if (fallback) {
      result.position = clean(fallback[1]);
      result.salary = clean(fallback[2]);
    }
  }

  // 2. 城市 + 经验 + 学历：格式 "深圳-南山区  3年以上  统招本科"
  const locationMatch = raw.match(/([一-龥]+(?:-[一-龥]+)?)\s+(\d+年以上|经验不限|应届生)\s+(本科|大专|硕士|博士|学历不限|统招本科)/m);
  if (locationMatch) {
    result.location = clean(locationMatch[1]);
    result.experience = clean(locationMatch[2]);
    result.education = clean(locationMatch[3]);
  }

  // 3. 公司名称：优先从 logo 区块取（公司信息下的第一行）
  const logoMatch = raw.match(/logo\s*\n+([^\n]{2,40})\s*\n/);
  if (logoMatch) {
    result.companyName = clean(logoMatch[1]);
  }
  // Fallback: 从"企业行业"前找公司名
  if (!result.companyName) {
    const altMatch = raw.match(/([^\n]{2,40})\s*\n\s*企业行业/);
    if (altMatch) result.companyName = clean(altMatch[1]);
  }

  // 4. 公司规模
  result.companySize = match1(raw, /人数规模[：:]\s*(\d+[-~]\d+人|\d+人以上|少于\d+人)/);

  // 5. 行业
  result.industry = match1(raw, /企业行业[：:]\s*([^\n]+)/);

  // 6. 融资状态
  result.listingStatus = match1(raw, /融资阶段[：:]\s*([^\n]+)/);

  // 7. 工作地址
  result.workAddress = match1(raw, /职位地址[：:]\s*([^\n]+)/).replace(/公司地址.*$/, "").replace(/查看.*地图.*$/, "").trim();

  // 8. JD 正文：职位介绍部分
  const jdMatch = raw.match(/职位介绍\s*\n+([\s\S]*?)(?=其他信息|公司简介|猎聘温馨提示|猜你喜欢)/);
  if (jdMatch) {
    result.jdText = clean(jdMatch[1]);
  }

  // 9. 公司介绍
  const introMatch = raw.match(/公司简介\s*\n+[\s\S]*?\n+([\s\S]*?)(?=查看全部|猎聘温馨提示|数据来源)/);
  if (introMatch) {
    result.companyIntro = clean(introMatch[1]).substring(0, 1000);
  }

  return result;
}
