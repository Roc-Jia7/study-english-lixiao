/**
 * lxll backend types, transcribed from real captured responses
 * (login, QueryUserProfileByToken, training/board, anti-forget/record,
 * anti-forget/detail). These are confirmed, not provisional.
 */

// ── Login (apiv2 customer/login) ──────────────────────────────────────
export type LxllLoginType = "PHONE_PASSWORD" | "ACCOUNT_PASSWORD" | "PHONE_CODE";

export interface LxllAccount {
  accessToken: string;
  expireAt: number;
  userId: string;
  userName: string;
  userNo: string;
  userType: string; // e.g. "STUDENT"
  companyId: string;
}

export interface LxllLoginData {
  refreshToken: string;
  expireAt: number;
  accounts: LxllAccount[];
}

// ── Profile (RPC QueryUserProfileByToken) ─────────────────────────────
export interface LxllCompany {
  companyId: string;
  companyName: string;
  companyRealName?: string;
  companyType?: string;
  companyLeaderName?: string;
}

export interface LxllUserProfile {
  userId: string;
  userName: string;
  accountNo: string;
  userRole: string; // "STUDENT" | "TEACHER" | ...
  age?: string;
  phone?: string;
  gender?: "MALE" | "FEMALE" | string;
  companyId?: string;
  company?: LxllCompany;
  /** Remaining review/lesson quota buckets shown in the app. */
  quotaThirty?: string;
  quotaSixty?: string;
  quotaTrial?: string;
}

// ── Student metric (RPC CustomerRetrieveStudentMetric) ────────────────
export interface LxllStudentMetric {
  totalLearnedWordCount: number;
  quota30?: string;
  sumQuota30?: string;
  quota60?: string;
  quotaAccompany?: string;
  quotaTrial?: string;
}

// ── Anti-forget review schedule (apiv2 anti-forget/record/student) ────
export interface LxllAntiForgetRecord {
  antiForgetDate: number;
  userName: string;
  userId: number;
  materialName: string;
  materialId: number;
  courseOrderId: number;
  antiForgetId: number;
  trainTime: number;
  status: "PENDING" | "DONE" | string;
}

/** Records grouped by the day they fall due. */
export interface LxllAntiForgetDay {
  time: number;
  records: LxllAntiForgetRecord[];
}

// ── Words (apiv2 anti-forget/detail) ──────────────────────────────────
export interface LxllWord {
  wordId: number;
  word: string;
  translation: string;
  phonetic: string; // note: real data has a trailing "\r"
  wrongTimes: number;
}

export interface LxllAntiForgetDetail {
  trainingTime: number;
  antiForgetId: number;
  courseOrderId: number;
  studentId: number;
  materialName: string;
  words: LxllWord[];
}

// ── Training board (apiv2 training/board) ─────────────────────────────
export interface LxllNamed {
  id: string;
  name: string;
  no?: string;
}
export interface LxllTrainingBoardItem {
  id: string;
  status: string;
  scheduleTime: number;
  type: string; // e.g. "MINUTE_30"
  student: LxllNamed;
  teacher: LxllNamed;
  material: LxllNamed & { type?: string };
  isAntiForgetCreated: boolean;
  isPaused: boolean;
}
