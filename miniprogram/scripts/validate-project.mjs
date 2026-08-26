import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(fs.readFileSync(path.join(projectDir, 'project.config.json'), 'utf8'))
const generatedPath = path.join(projectDir, 'src/data/case-library.generated.ts')
const generated = fs.readFileSync(generatedPath, 'utf8')

if (config.appid !== 'wxadf2543c5aec62b3') throw new Error('project.config.json AppID 不正确')
if (!generated.includes('export const caseRecords')) throw new Error('案例库数据未生成')
if (generated.includes('学生（后台真名）')) throw new Error('生成文件含后台真实姓名字段')
if (generated.includes('"备注"')) throw new Error('生成文件含后台备注字段')

const caseCount = (generated.match(/"id": "offer-/g) || []).length
const schoolsBlock = generated.slice(generated.indexOf('export const schools'), generated.indexOf('export const interviews'))
const schoolCount = (schoolsBlock.match(/"name":/g) || []).length
if (caseCount < 100) throw new Error(`案例数量异常：${caseCount}`)
if (schoolCount < 20) throw new Error(`学校数量异常：${schoolCount}`)

const distDir = path.join(projectDir, 'dist')
if (fs.existsSync(distDir)) {
  const sizeOf = (target) => fs.readdirSync(target, { withFileTypes: true }).reduce((total, entry) => {
    const entryPath = path.join(target, entry.name)
    return total + (entry.isDirectory() ? sizeOf(entryPath) : fs.statSync(entryPath).size)
  }, 0)
  const distBytes = sizeOf(distDir)
  if (distBytes > 2 * 1024 * 1024) throw new Error(`微信主包超过2MB：${distBytes} bytes`)
}

console.log(JSON.stringify({ appid: config.appid, cases: caseCount, schools: schoolCount, privacyFieldsExcluded: true }, null, 2))
