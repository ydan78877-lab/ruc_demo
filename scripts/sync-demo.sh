#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MINIPROGRAM_DIR="$REPO_ROOT/miniprogram"
DIST_DIR="$MINIPROGRAM_DIR/dist"
CLOUD_FUNCTION_REL="miniprogram/cloudfunctions/rucStudentApi"
CLOUD_FUNCTION_DIR="$REPO_ROOT/$CLOUD_FUNCTION_REL"
PRODUCTION_CLOUD_ENV_ID="cloudbase-d1gtlpks0104b2e4f"

DRY_RUN=0
SKIP_CLOUD=0
FORCE_CLOUD=0
VERSION=""
DESCRIPTION=""

usage() {
  cat <<'EOF'
同步本地 Demo 到 GitHub 和微信小程序开发版本。

用法：
  ./scripts/sync-demo.sh [选项] [更新说明]

选项：
  -m, --message <说明>   Git 提交信息和微信版本备注
  -v, --version <版本>   微信开发版本号；默认按当前时间生成
      --skip-cloud       即使云函数有改动也不部署 CloudBase
      --force-cloud      即使未检测到新差异也重新部署 CloudBase 云函数
      --dry-run          只检查和构建，不提交、推送、部署或上传
  -h, --help             显示帮助

示例：
  ./scripts/sync-demo.sh "优化概览页事项入口"
  ./scripts/sync-demo.sh -v 2026.8.23.3 -m "优化概览页事项入口"
  ./scripts/sync-demo.sh --dry-run -m "发布前检查"

可选环境变量：
  WECHAT_DEVTOOLS_CLI       微信开发者工具 cli 的绝对路径
  WECHAT_DEVTOOLS_CLI_PORT  cli 服务端口，默认 9420
  WECHAT_DEVTOOLS_CLI_TOKEN 开发者工具安全设置中配置的 cli token
EOF
}

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

warn() {
  printf '\n警告：%s\n' "$*" >&2
}

fail() {
  printf '\n失败：%s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令：$1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--message)
      [[ $# -ge 2 ]] || fail "$1 后需要填写说明"
      DESCRIPTION="$2"
      shift 2
      ;;
    -v|--version)
      [[ $# -ge 2 ]] || fail "$1 后需要填写版本号"
      VERSION="$2"
      shift 2
      ;;
    --skip-cloud)
      SKIP_CLOUD=1
      shift
      ;;
    --force-cloud)
      FORCE_CLOUD=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      [[ $# -gt 0 ]] && DESCRIPTION="$*"
      break
      ;;
    -*)
      fail "未知选项：$1"
      ;;
    *)
      [[ -z "$DESCRIPTION" ]] || fail "只能填写一段更新说明"
      DESCRIPTION="$1"
      shift
      ;;
  esac
done

[[ -n "$DESCRIPTION" ]] || DESCRIPTION="同步本地 Demo $(date '+%Y-%m-%d %H:%M')"
[[ -n "$VERSION" ]] || VERSION="$(date '+%Y.%m.%d.%H%M%S')"

[[ "$VERSION" =~ ^[A-Za-z0-9]+(\.[A-Za-z0-9]+)*$ ]] || \
  fail "版本号只能包含字母、数字和小数点：$VERSION"
[[ "$DESCRIPTION" != *$'\n'* ]] || fail "更新说明不能包含换行"

require_command git
require_command npm
require_command node

if command -v rg >/dev/null 2>&1; then
  SEARCH_COMMAND="rg"
else
  require_command grep
  SEARCH_COMMAND="grep"
fi

matches_file() {
  local pattern="$1"
  local file="$2"

  if [[ "$SEARCH_COMMAND" == "rg" ]]; then
    rg -q -I --no-messages -- "$pattern" "$file"
  else
    LC_ALL=C grep -Eq -- "$pattern" "$file" 2>/dev/null
  fi
}

cd "$REPO_ROOT"
[[ -f "$REPO_ROOT/package.json" ]] || fail "找不到仓库根目录 package.json"
[[ -f "$MINIPROGRAM_DIR/project.config.json" ]] || fail "找不到小程序 project.config.json"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "当前目录不是 Git 仓库"
BRANCH="$(git symbolic-ref --quiet --short HEAD)" || fail "当前处于 detached HEAD，请先切换到明确分支"

case "$DIST_DIR" in
  "$REPO_ROOT/miniprogram/dist") ;;
  *) fail "构建目录校验失败：$DIST_DIR" ;;
esac

DEFAULT_DEVTOOLS_CLI="/Applications/wechatwebdevtools.app/Contents/MacOS/cli"
DEVTOOLS_CLI="${WECHAT_DEVTOOLS_CLI:-$DEFAULT_DEVTOOLS_CLI}"
DEVTOOLS_PORT="${WECHAT_DEVTOOLS_CLI_PORT:-9420}"
DEVTOOLS_TOKEN="${WECHAT_DEVTOOLS_CLI_TOKEN:-}"

[[ -x "$DEVTOOLS_CLI" ]] || fail "找不到微信开发者工具 CLI：$DEVTOOLS_CLI"
[[ "$DEVTOOLS_PORT" =~ ^[0-9]+$ ]] || fail "WECHAT_DEVTOOLS_CLI_PORT 必须是数字"

log "同步目标"
printf 'GitHub 分支：origin/%s\n' "$BRANCH"
printf '微信版本号：%s\n' "$VERSION"
printf '更新说明：%s\n' "$DESCRIPTION"
printf '安全检查工具：%s\n' "$SEARCH_COMMAND"
[[ "$DRY_RUN" -eq 0 ]] || printf '运行模式：dry-run（不会修改远端）\n'
[[ "$FORCE_CLOUD" -eq 0 ]] || printf '云函数：本次强制重新部署 rucStudentApi\n'

log "获取 GitHub 最新状态"
git fetch --prune origin "$BRANCH" 2>/dev/null || git fetch --prune origin

REMOTE_REF="refs/remotes/origin/$BRANCH"
if git show-ref --verify --quiet "$REMOTE_REF"; then
  git merge-base --is-ancestor "origin/$BRANCH" HEAD || \
    fail "origin/$BRANCH 含有本地没有的提交，请先拉取并解决分支差异"
fi

CHANGED_PATHS_FILE="$(mktemp "${TMPDIR:-/tmp}/ruc-sync-changed.XXXXXX")"
trap 'rm -f "$CHANGED_PATHS_FILE"' EXIT

git status --porcelain=v1 --untracked-files=all | while IFS= read -r line; do
  [[ -n "$line" ]] || continue
  path="${line:3}"
  path="${path##* -> }"
  printf '%s\n' "$path"
done > "$CHANGED_PATHS_FILE"

unsafe_path() {
  local path="$1"
  local base
  base="$(basename "$path")"

  [[ "$base" == ".env.example" ]] && return 1
  case "$base" in
    .env|.env.*|cloudbaserc.json|project.private.config.json|private.*.key|*.pem|*.p12|*.pfx|*.jks|*.keystore|*.secret|*.token)
      return 0
      ;;
  esac

  case "$path" in
    *账号导出*|*用户导出*|*内测账号*|*openid*|*OpenID*)
      return 0
      ;;
  esac

  return 1
}

while IFS= read -r path; do
  [[ -n "$path" ]] || continue
  if unsafe_path "$path"; then
    fail "检测到禁止提交的本地配置、凭据或用户数据文件：$path"
  fi

  file="$REPO_ROOT/$path"
  if [[ -f "$file" ]]; then
    size="$(stat -f '%z' "$file" 2>/dev/null || stat -c '%s' "$file")"
    (( size <= 50000000 )) || fail "文件超过 50 MB，不自动提交：$path"

    if matches_file \
      '(BEGIN[[:space:]]+(RSA[[:space:]]+)?PRIVATE[[:space:]]+KEY|ADMIN_SESSION_SECRET[[:space:]]*=[[:space:]]*[^[:space:]#]+|WECHAT_DEVTOOLS_CLI_TOKEN[[:space:]]*=[[:space:]]*[^[:space:]#]+)' \
      "$file"; then
      fail "文件可能包含私钥或运行凭据，请人工检查：$path"
    fi
  fi
done < "$CHANGED_PATHS_FILE"

if matches_file '^web/src/' "$CHANGED_PATHS_FILE" && ! matches_file '^miniprogram/(src|config|package(-lock)?\.json)' "$CHANGED_PATHS_FILE"; then
  warn "检测到网页 Demo 的 web/src/ 改动，但没有同源小程序 miniprogram/src/ 改动。GitHub 会更新，微信包的页面可能不会变化。"
fi

CLOUD_CHANGED=0
if [[ -s "$CHANGED_PATHS_FILE" ]] && matches_file "^${CLOUD_FUNCTION_REL}/" "$CHANGED_PATHS_FILE"; then
  CLOUD_CHANGED=1
fi
if git show-ref --verify --quiet "$REMOTE_REF" && \
  ! git diff --quiet "origin/$BRANCH..HEAD" -- "$CLOUD_FUNCTION_REL"; then
  CLOUD_CHANGED=1
fi
if [[ "$FORCE_CLOUD" -eq 1 ]]; then
  CLOUD_CHANGED=1
fi

log "运行发布前检查"
npm run build
npm --prefix miniprogram run check
npm --prefix miniprogram run build:h5
npm --prefix miniprogram/cloudfunctions/rucStudentApi test

log "清理微信构建目录并重新构建"
mkdir -p "$DIST_DIR"
find "$DIST_DIR" -mindepth 1 -depth -delete
npm --prefix miniprogram run build:weapp
npm --prefix miniprogram run check

if [[ "$DRY_RUN" -eq 1 ]]; then
  log "dry-run 通过"
  if [[ "$CLOUD_CHANGED" -eq 1 && "$SKIP_CLOUD" -eq 0 ]]; then
    printf '正式运行时将部署 CloudBase 云函数 rucStudentApi。\n'
  fi
  printf '未执行：git add/commit/push、CloudBase 部署、微信上传。\n'
  exit 0
fi

log "提交本地修改"
git diff --check
git add -A
git diff --cached --check

if git diff --cached --quiet; then
  printf '没有新的工作区修改需要提交。\n'
else
  git commit -m "$DESCRIPTION"
fi

log "推送 GitHub"
if git show-ref --verify --quiet "$REMOTE_REF"; then
  git push origin "HEAD:$BRANCH"
else
  git push --set-upstream origin "HEAD:$BRANCH"
fi

if [[ "$CLOUD_CHANGED" -eq 1 && "$SKIP_CLOUD" -eq 0 ]]; then
  log "部署已修改的 CloudBase 云函数"
  CLOUD_ENV_ID="$(sed -n 's/^[[:space:]]*TARO_APP_CLOUD_ENV_ID[[:space:]]*=[[:space:]]*//p' "$MINIPROGRAM_DIR/.env.local" 2>/dev/null | tail -n 1 | tr -d '\r')"
  CLOUD_ENV_ID="${CLOUD_ENV_ID#\"}"
  CLOUD_ENV_ID="${CLOUD_ENV_ID%\"}"
  CLOUD_ENV_ID="${CLOUD_ENV_ID#\'}"
  CLOUD_ENV_ID="${CLOUD_ENV_ID%\'}"
  [[ -n "$CLOUD_ENV_ID" ]] || fail "云函数有改动，但 miniprogram/.env.local 未配置 TARO_APP_CLOUD_ENV_ID"

  if [[ "$BRANCH" != "main" && "$CLOUD_ENV_ID" == "$PRODUCTION_CLOUD_ENV_ID" ]]; then
    fail "非 main 分支禁止部署到内测正式 CloudBase 环境；请切换开发环境或使用 --skip-cloud"
  fi

  if command -v tcb >/dev/null 2>&1; then
    tcb -e "$CLOUD_ENV_ID" fn code update rucStudentApi \
      --dir "$CLOUD_FUNCTION_DIR" --deployMode cos --json
  else
    npx --yes -p @cloudbase/cli tcb -e "$CLOUD_ENV_ID" fn code update rucStudentApi \
      --dir "$CLOUD_FUNCTION_DIR" --deployMode cos --json
  fi
elif [[ "$CLOUD_CHANGED" -eq 1 ]]; then
  warn "云函数有改动，但已按 --skip-cloud 跳过部署。"
else
  printf '云函数没有改动，跳过 CloudBase 部署。\n'
fi

log "上传微信小程序开发版本"
UPLOAD_ARGS=(upload --project "$MINIPROGRAM_DIR" -v "$VERSION" -d "$DESCRIPTION" --lang zh)
if [[ -n "$DEVTOOLS_TOKEN" ]]; then
  UPLOAD_ARGS+=(--token "$DEVTOOLS_TOKEN")
else
  UPLOAD_ARGS+=(--port "$DEVTOOLS_PORT")
fi

if ! "$DEVTOOLS_CLI" "${UPLOAD_ARGS[@]}"; then
  cat >&2 <<EOF

GitHub 已推送，但微信开发版本上传失败。

请检查：
1. 微信开发者工具已登录当前小程序管理员/开发者账号；
2. 若开发者工具正开着，请在“设置 → 安全设置”开启服务端口，
   或先保存工作并关闭开发者工具后重新运行本脚本；
3. 也可以设置 WECHAT_DEVTOOLS_CLI_TOKEN 后重试。

脚本可重复运行；工作区干净时不会产生空提交，只会重新构建和上传新版本。
EOF
  exit 1
fi

log "同步完成"
printf 'GitHub：origin/%s @ %s\n' "$BRANCH" "$(git rev-parse --short HEAD)"
printf '微信开发版本：%s\n' "$VERSION"
printf '备注：%s\n' "$DESCRIPTION"
printf '\n下一步：把开发版本设为体验版\n'
printf '1. 打开 https://mp.weixin.qq.com/ 并登录当前小程序。\n'
printf '2. 进入“管理 → 版本管理”，找到版本 %s。\n' "$VERSION"
printf '3. 在该开发版本右侧选择“选为体验版”，再用体验二维码检查。\n'
printf '脚本不会自动提交审核或发布正式版。\n'
