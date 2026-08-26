import type { UserRecord } from "./types";

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function worksheet(name: string, headers: string[], rows: unknown[][]) {
  const row = (cells: unknown[], header = false) => `<Row>${cells.map((cell) => `<Cell${header ? ' ss:StyleID="Header"' : ""}><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join("")}</Row>`;
  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${row(headers, true)}${rows.map((item) => row(item)).join("")}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions></Worksheet>`;
}

export function downloadUserWorkbook(records: UserRecord[]) {
  const accountRows = records.map(({ user }) => [
    user.id, user.name, user.cohort, user.major, user.status === "active" ? "正常" : "已禁用",
    user.onboardingComplete ? "是" : "否", user.createdAt, user.lastLoginAt, user.updatedAt,
  ]);
  const profileRows = records.map(({ user, data }) => [
    user.id, data.profile.name, data.profile.school, data.profile.college, data.profile.major,
    data.profile.cohort, data.profile.gpa, data.profile.rank, data.profile.skills, data.profile.interests,
    data.notes, data.version, data.updatedAt,
  ]);
  const experienceRows = records.flatMap(({ user, data }) => data.experiences.map((item) => [
    user.id, user.name, item.id, item.type, item.name, item.result, item.startMonth, item.endMonth,
    item.resumeSection, item.details, JSON.stringify(item),
  ]));
  const workbook = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#DCEBFA" ss:Pattern="Solid"/></Style></Styles>${worksheet("账号", ["微信账号ID", "姓名", "年级", "专业", "状态", "已建档", "创建时间", "最近登录", "更新时间"], accountRows)}${worksheet("个人资料", ["微信账号ID", "姓名", "学校", "学院", "专业", "年级", "绩点", "排名", "技能", "兴趣爱好", "管理员备注", "数据版本", "更新时间"], profileRows)}${worksheet("经历", ["微信账号ID", "姓名", "经历ID", "类型", "名称", "结果", "开始年月", "结束年月", "简历板块", "具体内容", "完整数据"], experienceRows)}</Workbook>`;
  const blob = new Blob(["\ufeff", workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `人大中法内测账号_${new Date().toISOString().slice(0, 10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);
}
