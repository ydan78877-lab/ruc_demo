import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminApiError, adminRequest, clearAdminToken, getAdminToken, loginAdmin } from "./api";
import { downloadUserWorkbook } from "./exportExcel";
import type { AdminCampusOverview, AdminCampusSpace, AdminReminder, AuditLog, ExperienceRecord, PersonalData, StudentAccount, UserRecord } from "./types";
import "./admin.css";

const cohorts = ["19级", "20级", "21级", "22级", "23级", "24级", "25级", "26级"];
const majors = ["金融", "国管", "人管", "法语", "传播", "数学", "大数据", "人工智能"];
const actionNames: Record<string, string> = {
  "admin.login": "管理员登录", "user.data.update": "修改用户资料", "user.active": "恢复账号",
  "user.disabled": "禁用账号", "developer.bind": "绑定本地账号", "developer.data.update": "本地 demo 修改资料",
};
type AdminSection = "users" | "spaces" | "reminders" | "audit";

function formatTime(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function shortId(id: string) {
  return id.length > 14 ? `${id.slice(0, 7)}…${id.slice(-5)}` : id;
}

function LoginView({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) return setMessage("请输入管理账号和密码");
    setLoading(true);
    setMessage("");
    try {
      await loginAdmin(username.trim(), password);
      onSuccess();
    } catch (error) {
      setMessage(error instanceof AdminApiError ? error.message : "暂时无法登录，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return <main className="admin-login-page">
    <section className="admin-login-intro">
      <div className="admin-brand"><span>R</span><strong>人大中法学生助手</strong></div>
      <div className="admin-login-copy"><p>内部管理后台</p><h1>清楚掌握每一位内测用户的数据状态</h1><p>查看个人资料与档案、维护账号状态，并为本地 demo 绑定同一份真实数据。</p></div>
      <div className="admin-security-note"><span>仅限管理员</span><p>所有资料修改与账号状态操作都会留下记录。</p></div>
    </section>
    <section className="admin-login-panel">
      <form className="admin-login-card" onSubmit={submit}>
        <div className="admin-login-heading"><p>欢迎回来</p><h2>登录管理后台</h2><span>使用单独设置的超级管理员账号</span></div>
        <label><span>管理账号</span><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="请输入管理账号" /></label>
        <label><span>管理密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="请输入管理密码" /></label>
        {message ? <p className="admin-form-message" role="status">{message}</p> : null}
        <button type="submit" disabled={loading}>{loading ? "正在验证…" : "登录"}</button>
        <p className="admin-login-footnote">会话仅保留在当前浏览器标签页中</p>
      </form>
    </section>
  </main>;
}

function MetricCard({ label, value, note, tone }: { label: string; value: number; note: string; tone: string }) {
  return <article className={`admin-metric ${tone}`}><div><span>{label}</span><strong>{value}</strong></div><p>{note}</p></article>;
}

function statusTone(status: string) {
  if (status === "待处理") return "pending";
  if (status === "已取消" || status === "dissolved") return "disabled";
  return "active";
}

function SpacesView({ spaces, loading }: { spaces: AdminCampusSpace[]; loading: boolean }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const filtered = useMemo(() => spaces.filter((space) => {
    const needle = query.trim().toLowerCase();
    return (type === "all" || space.type === type) && (!needle || [space.name, space.code, space.ownerName, ...space.members.map((member) => member.name)].some((value) => value.toLowerCase().includes(needle)));
  }), [query, spaces, type]);
  const activeSpaces = spaces.filter((space) => space.status !== "dissolved");
  return <>
    <div className="admin-metrics"><MetricCard label="互动空间" value={activeSpaces.length} note={`${spaces.length - activeSpaces.length} 个空间已解散`} tone="blue" /><MetricCard label="课程" value={activeSpaces.filter((space) => space.type === "课程").length} note="当前有效课程空间" tone="teal" /><MetricCard label="班级" value={activeSpaces.filter((space) => space.type === "班级").length} note="当前有效行政班空间" tone="cyan" /></div>
    <section className="admin-table-card admin-readonly-table">
      <div className="admin-table-tools"><div className="admin-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索空间、加入码、负责人或成员" /></div><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">全部类型</option><option value="课程">课程</option><option value="班级">班级</option></select><span>共 {filtered.length} 个结果</span></div>
      <div className="admin-table-wrap"><table><thead><tr><th>空间</th><th>负责人</th><th>成员</th><th>空间事项</th><th>加入方式</th><th>最近更新</th></tr></thead><tbody>{filtered.map((space) => <tr key={space.id}><td><strong>{space.name}</strong><small>{space.type} · {space.status === "dissolved" ? "已解散" : "使用中"}</small></td><td><strong>{space.ownerName}</strong><small>{shortId(space.ownerId)}</small></td><td><strong>{space.memberCount} 人</strong><small>{space.members.slice(0, 3).map((member) => `${member.name}（${member.role}）`).join("、") || "暂无成员"}</small></td><td><strong>{space.matterCount} 项</strong><small>{space.pendingCount} 条个人状态待处理</small></td><td><strong>{space.approvalRequired ? "需要审核" : "直接加入"}</strong><small>加入码 {space.code || "—"}</small></td><td>{formatTime(space.updatedAt)}</td></tr>)}</tbody></table></div>
      {!loading && filtered.length === 0 ? <div className="admin-empty"><strong>还没有符合条件的空间</strong><span>小程序创建班级或课程后会显示在这里。</span></div> : null}
    </section>
  </>;
}

function RemindersView({ reminders, loading }: { reminders: AdminReminder[]; loading: boolean }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => reminders.filter((reminder) => {
    const needle = query.trim().toLowerCase();
    const statusMatches = status === "all" || (status === "pending" ? reminder.status === "待处理" : reminder.status !== "待处理");
    return (scope === "all" || reminder.scope === scope) && statusMatches && (!needle || [reminder.userName, reminder.userCohort, reminder.userMajor, reminder.title, reminder.spaceName].some((value) => value.toLowerCase().includes(needle)));
  }), [query, reminders, scope, status]);
  const pending = reminders.filter((reminder) => reminder.status === "待处理").length;
  return <>
    <div className="admin-metrics"><MetricCard label="个人状态记录" value={reminders.length} note="共享事项按成员拆分后的状态" tone="blue" /><MetricCard label="待处理" value={pending} note="尚未确认或完成" tone="teal" /><MetricCard label="已处理" value={reminders.length - pending} note="已确认、已完成或已取消" tone="cyan" /></div>
    <section className="admin-table-card admin-readonly-table">
      <div className="admin-table-tools"><div className="admin-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索用户、事项或来源空间" /></div><select value={scope} onChange={(event) => setScope(event.target.value)}><option value="all">全部来源</option><option value="space">班级与课程</option><option value="personal">个人事项</option></select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">全部状态</option><option value="pending">待处理</option><option value="processed">已处理</option></select><span>共 {filtered.length} 条</span></div>
      <div className="admin-table-wrap"><table><thead><tr><th>用户</th><th>事项</th><th>来源</th><th>当前状态</th><th>时间</th><th>状态更新</th></tr></thead><tbody>{filtered.map((reminder) => <tr key={reminder.id}><td><strong>{reminder.userName}</strong><small>{reminder.userCohort || "—"} · {reminder.userMajor || "未填写专业"}</small></td><td><strong>{reminder.title}</strong><small>{reminder.type} · {reminder.action}</small></td><td><strong>{reminder.spaceName}</strong><small>{reminder.scope === "personal" ? "个人提醒" : "共享空间事项"}</small></td><td><span className={`admin-status ${statusTone(reminder.status)}`}>{reminder.status}</span></td><td><strong>{reminder.date || "—"} {reminder.clock}</strong><small>{reminder.time || "未设置补充时间"}</small></td><td>{formatTime(reminder.updatedAt)}</td></tr>)}</tbody></table></div>
      {!loading && filtered.length === 0 ? <div className="admin-empty"><strong>还没有符合条件的事项状态</strong><span>共享事项和个人提醒会按用户汇总在这里。</span></div> : null}
    </section>
  </>;
}

function UserEditor({ record, onClose, onSaved, onStatusChanged, developerUserId, onBindDeveloper }: {
  record: UserRecord;
  onClose: () => void;
  onSaved: (record: UserRecord) => void;
  onStatusChanged: (user: StudentAccount) => void;
  developerUserId: string;
  onBindDeveloper: (id: string) => void;
}) {
  const [draft, setDraft] = useState<PersonalData>(() => clone(record.data));
  const [tab, setTab] = useState<"profile" | "experiences" | "advanced">("profile");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [checksJson, setChecksJson] = useState(() => JSON.stringify(record.data.graduationChecks || {}, null, 2));
  const [todosJson, setTodosJson] = useState(() => JSON.stringify(record.data.todoStates || {}, null, 2));
  const [templateJson, setTemplateJson] = useState(() => JSON.stringify(record.data.templateConfig || {}, null, 2));

  const updateProfile = (key: keyof PersonalData["profile"], value: string) => setDraft((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  const updateExperience = (id: string, key: keyof ExperienceRecord, value: string) => setDraft((current) => ({ ...current, experiences: current.experiences.map((item) => item.id === id ? { ...item, [key]: value } : item) }));
  const addExperience = () => setDraft((current) => ({ ...current, experiences: [...current.experiences, { id: `admin-${Date.now()}`, type: "其他", name: "", result: "", startMonth: "", endMonth: "", details: "", resumeSection: "" }] }));

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const data = clone(draft);
      data.graduationChecks = JSON.parse(checksJson || "{}");
      data.todoStates = JSON.parse(todosJson || "{}");
      data.templateConfig = JSON.parse(templateJson || "{}");
      const result = await adminRequest<{ ok: true; user: StudentAccount; data: PersonalData }>(`/admin/users/${encodeURIComponent(record.user.id)}`, { method: "PUT", body: { data } });
      onSaved({ user: result.user, data: result.data });
      setMessage("资料已保存");
    } catch (error) {
      setMessage(error instanceof SyntaxError ? "高级数据不是有效的 JSON" : error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    const status = record.user.status === "active" ? "disabled" : "active";
    if (!window.confirm(status === "disabled" ? "禁用后该用户将无法进入小程序，数据会继续保留。确定禁用？" : "确定恢复这个账号？")) return;
    setSaving(true);
    try {
      const result = await adminRequest<{ ok: true; user: StudentAccount }>(`/admin/users/${encodeURIComponent(record.user.id)}/status`, { method: "PUT", body: { status } });
      onStatusChanged(result.user);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "账号状态更新失败");
    } finally {
      setSaving(false);
    }
  };

  return <div className="admin-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="admin-drawer" aria-label="用户资料编辑">
      <header><div><p>{shortId(record.user.id)}</p><h2>{record.user.name || "未完成建档"}</h2><span>{record.user.cohort || "未选择年级"} · {record.user.major || "未选择专业"}</span></div><button aria-label="关闭" onClick={onClose}>×</button></header>
      <div className="admin-drawer-toolbar">
        <span className={`admin-status ${record.user.status}`}>{record.user.status === "active" ? "账号正常" : "已禁用"}</span>
        <button className="text-button" onClick={() => onBindDeveloper(record.user.id)} disabled={developerUserId === record.user.id}>{developerUserId === record.user.id ? "本地 demo 当前账号" : "设为本地 demo 账号"}</button>
        <button className={record.user.status === "active" ? "danger-button" : "restore-button"} onClick={toggleStatus} disabled={saving}>{record.user.status === "active" ? "禁用账号" : "恢复账号"}</button>
      </div>
      <nav className="admin-drawer-tabs"><button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>个人资料</button><button className={tab === "experiences" ? "active" : ""} onClick={() => setTab("experiences")}>经历档案 <span>{draft.experiences.length}</span></button><button className={tab === "advanced" ? "active" : ""} onClick={() => setTab("advanced")}>全部数据</button></nav>
      <div className="admin-drawer-body">
        {tab === "profile" ? <>
          <div className="editor-section-title"><div><h3>基本信息</h3><p>姓名、年级、专业会同步到账号列表</p></div></div>
          <div className="editor-grid">
            <label><span>真实姓名</span><input value={draft.profile.name} onChange={(event) => updateProfile("name", event.target.value)} /></label>
            <label><span>年级</span><select value={draft.profile.cohort} onChange={(event) => updateProfile("cohort", event.target.value)}><option value="">请选择</option>{cohorts.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>专业</span><input list="admin-major-options" value={draft.profile.major} onChange={(event) => updateProfile("major", event.target.value)} /><datalist id="admin-major-options">{majors.map((item) => <option key={item}>{item}</option>)}</datalist></label>
            <label><span>学校</span><input value={draft.profile.school} onChange={(event) => updateProfile("school", event.target.value)} /></label>
            <label><span>学院</span><input value={draft.profile.college} onChange={(event) => updateProfile("college", event.target.value)} /></label>
            <label><span>平均学分绩点</span><input value={draft.profile.gpa} onChange={(event) => updateProfile("gpa", event.target.value)} /></label>
            <label><span>绩点排名</span><input value={draft.profile.rank} onChange={(event) => updateProfile("rank", event.target.value)} placeholder="如 7/120" /></label>
          </div>
          <div className="editor-section-title"><div><h3>技能与爱好</h3><p>直接编辑，不生成经历记录</p></div></div>
          <div className="editor-grid single"><label><span>技能</span><textarea value={draft.profile.skills} onChange={(event) => updateProfile("skills", event.target.value)} /></label><label><span>兴趣与爱好</span><textarea value={draft.profile.interests} onChange={(event) => updateProfile("interests", event.target.value)} /></label><label><span>管理员备注</span><textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="仅后台维护使用" /></label></div>
        </> : null}
        {tab === "experiences" ? <>
          <div className="editor-section-title"><div><h3>经历档案</h3><p>可新增、修改或移除用户的经历记录</p></div><button onClick={addExperience}>＋ 新增经历</button></div>
          <div className="admin-experience-list">{draft.experiences.map((item, index) => <article key={item.id} className="admin-experience-editor">
            <div className="experience-editor-heading"><strong>{item.name || `新经历 ${index + 1}`}</strong><button onClick={() => setDraft((current) => ({ ...current, experiences: current.experiences.filter((experience) => experience.id !== item.id) }))}>移除</button></div>
            <div className="editor-grid"><label><span>类型</span><input value={item.type || ""} onChange={(event) => updateExperience(item.id, "type", event.target.value)} /></label><label><span>经历名称</span><input value={item.name || ""} onChange={(event) => updateExperience(item.id, "name", event.target.value)} /></label><label><span>结果</span><input value={item.result || ""} onChange={(event) => updateExperience(item.id, "result", event.target.value)} /></label><label><span>简历板块</span><input value={item.resumeSection || ""} onChange={(event) => updateExperience(item.id, "resumeSection", event.target.value)} /></label><label><span>开始年月</span><input type="month" value={item.startMonth || ""} onChange={(event) => updateExperience(item.id, "startMonth", event.target.value)} /></label><label><span>结束年月</span><input type="month" value={item.endMonth || ""} onChange={(event) => updateExperience(item.id, "endMonth", event.target.value)} /></label></div>
            <label className="wide-field"><span>具体内容</span><textarea value={item.details || ""} onChange={(event) => updateExperience(item.id, "details", event.target.value)} /></label>
          </article>)}{draft.experiences.length === 0 ? <div className="admin-inline-empty">该用户还没有经历记录</div> : null}</div>
        </> : null}
        {tab === "advanced" ? <>
          <div className="editor-section-title"><div><h3>全部数据</h3><p>用于维护目标模版、毕业自查和待办状态；修改后会直接同步。</p></div></div>
          <div className="advanced-warning">请保持 JSON 格式正确。普通资料与经历建议在前两个页面编辑。</div>
          <label className="json-field"><span>目标模版</span><textarea value={templateJson} onChange={(event) => setTemplateJson(event.target.value)} /></label>
          <label className="json-field"><span>毕业自查</span><textarea value={checksJson} onChange={(event) => setChecksJson(event.target.value)} /></label>
          <label className="json-field"><span>待办状态</span><textarea value={todosJson} onChange={(event) => setTodosJson(event.target.value)} /></label>
        </> : null}
      </div>
      <footer>{message ? <p>{message}</p> : <span>数据版本 {record.data.version} · {formatTime(record.data.updatedAt)}</span>}<button onClick={save} disabled={saving}>{saving ? "保存中…" : "保存全部修改"}</button></footer>
    </aside>
  </div>;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [users, setUsers] = useState<StudentAccount[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [campus, setCampus] = useState<AdminCampusOverview>({ spaces: [], reminders: [], syncedAt: "" });
  const [developerUserId, setDeveloperUserId] = useState("");
  const [section, setSection] = useState<AdminSection>("users");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [selected, setSelected] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const handleError = (error: unknown) => {
    if (error instanceof AdminApiError && error.code === "ADMIN_UNAUTHORIZED") return onLogout();
    setMessage(error instanceof Error ? error.message : "数据读取失败");
  };

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const [userResult, campusResult, auditResult, developerResult] = await Promise.all([
        adminRequest<{ ok: true; users: StudentAccount[] }>("/admin/users"),
        adminRequest<AdminCampusOverview & { ok: true }>("/admin/campus"),
        adminRequest<{ ok: true; logs: AuditLog[] }>("/admin/audit"),
        adminRequest<{ ok: true; userId: string }>("/admin/developer-account"),
      ]);
      setUsers(userResult.users);
      setCampus({ spaces: campusResult.spaces, reminders: campusResult.reminders, syncedAt: campusResult.syncedAt });
      setLogs(auditResult.logs);
      setDeveloperUserId(developerResult.userId);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => users.filter((user) => {
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    const needle = query.trim().toLowerCase();
    return matchesStatus && (!needle || [user.name, user.cohort, user.major, user.id].some((value) => value.toLowerCase().includes(needle)));
  }), [query, statusFilter, users]);

  const openUser = async (user: StudentAccount) => {
    setMessage("");
    try {
      const result = await adminRequest<UserRecord & { ok: true }>(`/admin/users/${encodeURIComponent(user.id)}`);
      setSelected({ user: result.user, data: result.data });
    } catch (error) { handleError(error); }
  };

  const bindDeveloper = async (id: string) => {
    if (!window.confirm("本地 H5 demo 将读取并修改这个微信账号的真实数据。确定绑定？")) return;
    try {
      const result = await adminRequest<{ ok: true; userId: string }>("/admin/developer-account", { method: "PUT", body: { userId: id } });
      setDeveloperUserId(result.userId);
    } catch (error) { handleError(error); }
  };

  const exportAll = async () => {
    setMessage("");
    try {
      const result = await adminRequest<{ ok: true; records: UserRecord[] }>("/admin/export");
      downloadUserWorkbook(result.records);
    } catch (error) { handleError(error); }
  };

  const activeCount = users.filter((user) => user.status === "active").length;
  const completeCount = users.filter((user) => user.onboardingComplete).length;
  const sectionTitles: Record<AdminSection, string> = { users: "用户与个人数据", spaces: "班级与课程", reminders: "事项提醒", audit: "操作记录" };

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand"><span>R</span><div><strong>人大中法</strong><small>学生助手后台</small></div></div>
      <nav><button className={section === "users" ? "active" : ""} onClick={() => setSection("users")}><span>账号</span><small>{users.length}</small></button><button className={section === "spaces" ? "active" : ""} onClick={() => setSection("spaces")}><span>班级与课程</span><small>{campus.spaces.length}</small></button><button className={section === "reminders" ? "active" : ""} onClick={() => setSection("reminders")}><span>事项提醒</span><small>{campus.reminders.length}</small></button><button className={section === "audit" ? "active" : ""} onClick={() => setSection("audit")}><span>操作记录</span><small>{logs.length}</small></button></nav>
      <div className="admin-sidebar-bottom"><span>超级管理员</span><button onClick={onLogout}>退出登录</button></div>
    </aside>
    <section className="admin-main">
      <header className="admin-topbar"><div><p>内部测试管理</p><h1>{sectionTitles[section]}</h1></div><div className="admin-topbar-actions"><button onClick={() => void load()}>刷新</button>{section === "users" ? <button className="primary" onClick={() => void exportAll()}>导出 Excel</button> : null}</div></header>
      {message ? <div className="admin-alert">{message}</div> : null}
      {section === "users" ? <>
        <div className="admin-metrics"><MetricCard label="内测账号" value={users.length} note="已进入过小程序的微信账号" tone="blue" /><MetricCard label="正常使用" value={activeCount} note={`${users.length - activeCount} 个账号已禁用`} tone="teal" /><MetricCard label="完成建档" value={completeCount} note={`${users.length - completeCount} 个账号待填写资料`} tone="cyan" /></div>
        <section className="admin-table-card">
          <div className="admin-table-tools"><div className="admin-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名、专业、年级或账号 ID" /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">全部状态</option><option value="active">正常</option><option value="disabled">已禁用</option></select><span>共 {filtered.length} 个结果</span></div>
          <div className="admin-table-wrap"><table><thead><tr><th>用户</th><th>年级 / 专业</th><th>状态</th><th>最近登录</th><th>数据更新</th><th /></tr></thead><tbody>{filtered.map((user) => <tr key={user.id} onClick={() => void openUser(user)}><td><div className="admin-user-cell"><span>{user.name ? user.name.slice(-1) : "?"}</span><div><strong>{user.name || "未完成建档"}</strong><small>{shortId(user.id)}</small></div></div></td><td><strong>{user.cohort || "—"}</strong><small>{user.major || "未填写专业"}</small></td><td><span className={`admin-status ${user.status}`}>{user.status === "active" ? "正常" : "已禁用"}</span>{developerUserId === user.id ? <small className="developer-badge">本地 demo</small> : null}</td><td>{formatTime(user.lastLoginAt)}</td><td>{formatTime(user.updatedAt)}</td><td><button className="row-action">查看 ›</button></td></tr>)}</tbody></table></div>
          {!loading && filtered.length === 0 ? <div className="admin-empty"><strong>还没有符合条件的账号</strong><span>内测用户首次进入小程序后会显示在这里。</span></div> : null}
          {loading ? <div className="admin-empty"><strong>正在读取账号…</strong></div> : null}
        </section>
      </> : null}
      {section === "spaces" ? <SpacesView spaces={campus.spaces} loading={loading} /> : null}
      {section === "reminders" ? <RemindersView reminders={campus.reminders} loading={loading} /> : null}
      {section === "audit" ? <section className="admin-audit-card"><div className="admin-audit-heading"><div><h2>最近 100 条操作</h2><p>账号状态、资料编辑、后台登录与本地账号绑定都会留痕。</p></div></div><div className="admin-audit-list">{logs.map((log) => <article key={log._id}><span className="audit-dot" /><div><strong>{actionNames[log.action] || log.action}</strong><p>{log.targetUserId ? `对象：${shortId(log.targetUserId)}` : "系统操作"}</p></div><time>{formatTime(log.createdAt)}</time></article>)}{!logs.length && !loading ? <div className="admin-inline-empty">暂无操作记录</div> : null}</div></section> : null}
    </section>
    {selected ? <UserEditor record={selected} developerUserId={developerUserId} onClose={() => setSelected(null)} onBindDeveloper={(id) => void bindDeveloper(id)} onSaved={(record) => { setSelected(record); setUsers((current) => current.map((user) => user.id === record.user.id ? record.user : user)); }} onStatusChanged={(user) => { setSelected((current) => current ? { ...current, user } : current); setUsers((current) => current.map((item) => item.id === user.id ? user : item)); }} /> : null}
  </main>;
}

export default function AdminApp() {
  const [authenticated, setAuthenticated] = useState(Boolean(getAdminToken()));
  useEffect(() => {
    document.body.classList.add("admin-route");
    return () => document.body.classList.remove("admin-route");
  }, []);
  const logout = () => { clearAdminToken(); setAuthenticated(false); };
  return authenticated ? <Dashboard onLogout={logout} /> : <LoginView onSuccess={() => setAuthenticated(true)} />;
}
