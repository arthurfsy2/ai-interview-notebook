// ===== 面试记录 =====

export interface AITags {
  interviewerStyle: '专业' | '友好' | '冷淡' | '敷衍' | '压力面' | null;
  interviewDepth: '浅(仅HR)' | '中(技术面+HR)' | '深(多轮+高管)' | null;
  questions: string[];
  keyTopics: string[];
  redFlags: string[];
  greenFlags: string[];
  salarySignal: '高' | '中' | '低' | '未透露' | null;
  commuteAssessment: '近' | '中等' | '远' | null;
  rejectionReason: '技术不匹配' | '业务调整' | '薪资谈不拢' | '竞争激烈' | '其他' | null;
  rejectionControllability: '可控(个人可提升)' | '不可控(外部因素)' | '未知' | null;
}

export interface AIInsights {
  summary: string;
  keyFindings: string[];
  improvementSuggestions: string[];
  prepFocus: string[];
}

export interface Interview {
  id: string;
  userId: string;
  companyName: string;
  position: string;
  interviewDate: string;
  interviewMode: '线上' | '线下' | '混合';
  result: '通过' | '被拒' | '主动放弃' | '无消息' | '待定';
  experienceRating: number;
  rounds: number;
  salaryRange?: string;
  commuteTime?: string;
  workSchedule?: string;
  notes: string;
  aiTags?: AITags;
  aiInsights?: AIInsights;
  questions?: string[];
  preInterviewAnalysis?: PreInterviewAnalysis;
  createdAt: string;
  updatedAt: string;
}

// ===== 面试前分析 =====

export interface CompanyAnalysis {
  scale: string;
  financingStage: string;
  foundedYear?: number;
  stabilityRisk: '低' | '中' | '高';
  riskNotes: string[];
  industryOutlook: string;
}

export interface JDAnalysis {
  coreRequirements: string[];
  niceToHave: string[];
  redFlags: string[];
  workSchedule: '双休' | '大小周' | '单休' | '996' | '未提及';
  listedSalaryRange?: string;
}

export interface SalaryConversion {
  targetSchedule: string;
  equivalentMonthly: number;
  equivalentAnnual: number;
  premium: number;
  premiumPercent: number;
  formula: string;
}

export interface ResumeMatch {
  overallScore: number;
  skillMatch: number;
  experienceMatch: number;
  industryMatch: number;
  matchDetails: string[];
  gapDetails: string[];
}

export interface CareerAssessment {
  outlook: '积极' | '中性' | '消极';
  growthPotential: number;
  skillGrowth: string[];
  titleProgression: string;
  notes: string;
}

export interface CompanyCulture {
  keywords: string[];
  employeeSentiment: '积极' | '中性' | '消极';
  highlights: string[];
  warnings: string[];
  source: string;
}

export interface WorkIntensity {
  expectedOvertime: '低' | '中' | '高';
  signals: string[];
  compensation: '有加班费' | '调休' | '无补偿' | '未提及';
  weekendWork: '无' | '偶尔' | '经常';
}

export interface BenefitsDetail {
  insurance: '五险一金' | '仅社保' | '未提及';
  annualBonus: '有' | '无' | '未提及';
  perks: string[];
  leaveDays: string;
}

export interface DecisionResult {
  verdict: '建议去' | '可考虑' | '谨慎' | '不建议';
  score: number;
  vetoReason?: string;
  pros: string[];
  cons: string[];
  summary: string;
}

export interface PreInterviewAnalysis {
  id: string;
  userId: string;
  companyName: string;
  position: string;
  jdRawText: string;
  analysisResult?: PreInterviewAnalysisResult;
  verdict?: string;
  score?: number;
  vetoReason?: string;
  linkedInterviewId?: string;
  interview?: Interview;
  createdAt: string;
}

export interface PreInterviewAnalysisResult {
  companyAnalysis: CompanyAnalysis;
  jdAnalysis: JDAnalysis;
  salaryConversion: SalaryConversion;
  resumeMatch: ResumeMatch;
  careerAssessment: CareerAssessment;
  companyCulture?: CompanyCulture;
  workIntensity?: WorkIntensity;
  benefitsDetail?: BenefitsDetail;
  decision: DecisionResult;
}

// ===== 事前事后对比 =====

export interface BeforeAfterComparison {
  preInterviewId: string;
  interviewId: string;
  expectationMatches: boolean;
  keyDifferences: string[];
  lessonsLearned: string[];
  createdAt: string;
}

// ===== 用户档案 =====

export interface CurrentSalary {
  monthlyPreTax: number;
  workSchedule: '双休' | '大小周' | '单休' | '996';
  monthsPerYear: number;
}

export type PriorityKey = 'salary' | 'proximity' | 'workSchedule' | 'stability' | 'industry';

export interface Residence {
  city: string;
  district?: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  resumeText: string;
  currentTitle: string;
  yearsOfExperience: number;
  targetTitle: string;
  targetIndustry: string[];
  currentSalary: CurrentSalary;
  location: string;
  priorities: PriorityKey[];
  residence: Residence;
}

// ===== API 响应 =====

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===== 统计 =====

export interface DashboardStats {
  totalInterviews: number;
  resultDistribution: Record<string, number>;
  experienceDistribution: Record<string, number>;
  highRiskCompanies: number;
  totalRedFlags: number;
  topTopics: { topic: string; count: number }[];
}
