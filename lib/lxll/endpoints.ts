/**
 * Endpoint registry for the lxll backend, transcribed verbatim from the
 * official H5 client bundle. Names are exact; grouping is ours.
 *
 * RPC names go to api.lxll.com/request/<Name>.
 * REST paths (lowercase, slashes) go to apiv2.lxll.com/<path>.
 */

export const LXLL_RPC = {
  // ── Auth (consumer / "Customer" accounts: parents & students) ──
  loginByPhoneAndPassword: "CustomerLoginByPhoneAndPassword",
  loginByPhoneCode: "CustomerLoginByPhoneCode",
  loginByWeChat: "CustomerLoginByWeChat",
  applyLoginPhoneCode: "ApplyUserLoginPhoneCode",
  checkUserExistByPhone: "CheckUserExistByPhone",
  queryUserProfileByToken: "QueryUserProfileByToken",
  logout: "Logout",

  // ── Student courses & profile ──
  listStudentCourses: "CustomerListStudentCourese", // (sic: backend spelling)
  listUserSubscriptionCourse: "CustomerListUserSubscriptionCourse",
  queryCourseDetail: "CustomerQueryCourseDetail",
  listCourseBook: "CustomerListCourseBook",
  listCourseWordByCourseId: "CustomerListCourseWordByCourseId",
  listCourseAllWord: "CustomerListCourseAllWord",
  listCourseProgressData: "CustomerListCourseProgressData",
  studentQueryDetail: "CustomerStudentQueryDetail",
  setStudentUserProfile: "CustomerSetStudentUserProfile",
  retrieveStudentMetric: "CustomerRetrieveStudentMetric",

  // ── Anti-forget (spaced repetition) — the backend's own forgetting curve ──
  listNewWords: "CustomerListNewWords",
  listReviewWords: "CustomerListReviewWords",
  submitLearnNewWordResult: "CustomerSubmitLearnNewWordResult",
  submitReviewResult: "CustomerSubmitReviewResult",
  getCourseOrderCount: "CustomerGetCourseOrderCount",
  countPendingLearnNewWords: "CustomerCountCourseOrderPendingLearnNewWords",
  listPendingLearnNewWords: "CustomerListCourseOrderPendingLearnNewWords",
  generateAntiForgetCourseOrders: "CustomerGenerateAntiForgetCourseOrders",
  listAntiForgetCourseWord: "CustomerListAntiForgetCourseWord",
  markCourseWordsAsLearned: "CustomerMarkCourseWordsAsLearned",

  // ── Favorite words ──
  listFavoriteWords: "CustomerListFavoriteWords",
  addWordAsFavorite: "CustomerAddWordAsFavorite",
  removeWordFromFavorite: "CustomerRemoveWordFromFavorite",
} as const;

export const LXLL_REST = {
  login: "customer/login",
  logout: "customer/logout",
  refreshToken: "customer/refresh-token",
  smsCode: "customer/sms/code",
  register: "customer/register",
  resetPassword: "customer/reset-password",
} as const;

export type LxllRpcKey = keyof typeof LXLL_RPC;
