import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectDir = path.resolve(scriptDir, '..')
const repoDir = path.resolve(projectDir, '..')
const sourceDir = path.resolve(process.argv[2] || '/Users/taofangzheng/Desktop/中法app')

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        value += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(value)
      value = ''
    } else if (char === '\n') {
      row.push(value.replace(/\r$/, ''))
      rows.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
  }

  if (value || row.length) {
    row.push(value.replace(/\r$/, ''))
    rows.push(row)
  }

  const headers = (rows.shift() || []).map((header) => header.replace(/^\uFEFF/, '').trim())
  return rows
    .filter((values) => values.some((item) => item.trim()))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, (values[index] || '').trim()])))
}

function readCsv(filename) {
  const filePath = path.join(sourceDir, filename)
  if (!fs.existsSync(filePath)) throw new Error(`缺少 CSV：${filePath}`)
  return parseCsv(fs.readFileSync(filePath, 'utf8'))
}

function yes(value) {
  return value === '是' || value === 'true' || value === '1'
}

function splitTags(value) {
  return value
    .split(/[\s,，]+/)
    .map((item) => item.replace(/^#/, '').trim())
    .filter(Boolean)
}

function normalizeDate(value) {
  return value.replaceAll('/', '-')
}

function normalizeRegion(value) {
  return value === '欧洲' ? '法国' : value
}

function logoFilename(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || '')
  } catch {
    return ''
  }
}

const offerRows = readCsv('offer表.csv')
const schoolRows = readCsv('学校表.csv')
const interviewRows = readCsv('专访表.csv')
const configRows = readCsv('页面配置表.csv')

const sourceLogoDir = path.join(repoDir, 'public/assets/case-library/school-logos')
const sourceBrandDir = path.join(repoDir, 'public/assets/case-library/brand')
const sourceQrDir = path.join(repoDir, 'public/assets/case-library/contact-qrs')
const targetLogoDir = path.join(projectDir, 'src/assets/case-library/school-logos')
const targetBrandDir = path.join(projectDir, 'src/assets/case-library/brand')
const targetQrDir = path.join(projectDir, 'src/assets/case-library/contact-qrs')

fs.mkdirSync(targetLogoDir, { recursive: true })
fs.mkdirSync(targetBrandDir, { recursive: true })
fs.mkdirSync(targetQrDir, { recursive: true })

const schools = schoolRows
  .filter((row) => row['学校名称'])
  .map((row) => {
    const filename = logoFilename(row['校徽图片URL'])
    const source = path.join(sourceLogoDir, filename)
    if (!filename || !fs.existsSync(source)) throw new Error(`找不到学校校徽：${row['学校名称']} (${filename})`)
    fs.copyFileSync(source, path.join(targetLogoDir, filename))
    return { name: row['学校名称'], logoPath: `/assets/case-library/school-logos/${filename}` }
  })

const schoolLogoMap = new Map(schools.map((school) => [school.name, school.logoPath]))

const caseRecords = offerRows
  .filter((row) => yes(row['是否前台展示']))
  .map((row, index) => {
    const publicName = row['学生姓名'] || '匿名同学'
    const tags = splitTags(row['标签'])
    const record = {
      id: `offer-${row['申请季'] || 'unknown'}-${String(index + 1).padStart(3, '0')}`,
      applicationSeason: row['申请季'],
      studentName: publicName,
      tags,
      school: row['录取学校'],
      program: row['录取专业'],
      region: normalizeRegion(row['国家（地区）']),
      undergradCollege: row['本科学院'],
      undergradMajor: row['本科专业'],
      gpa: row['GPA/均分'],
      englishScore: row['英语成绩'],
      greGmat: row['GRE/GMAT'],
      internships: row['实习经历'],
      research: row['科研经历'],
      applicationAt: normalizeDate(row['申请时间']),
      admissionAt: normalizeDate(row['录取时间']),
      showStudentCard: yes(row['是否展示学生名片']),
      studentCardIntro: row['学生名片简介'],
      isFinalDestination: yes(row['是否是最终去向']),
      sortWeight: Number(row['排序权重']) || 0,
      logoPath: schoolLogoMap.get(row['录取学校']) || '',
      searchText: ''
    }
    record.searchText = [
      record.applicationSeason,
      record.studentName,
      ...record.tags,
      record.school,
      record.program,
      record.region,
      record.undergradCollege,
      record.undergradMajor,
      record.gpa,
      record.englishScore,
      record.greGmat,
      record.internships,
      record.research
    ].join(' ').toLowerCase()
    return record
  })
  .sort((left, right) => right.sortWeight - left.sortWeight || right.applicationSeason.localeCompare(left.applicationSeason))

const brandLogo = 'lehu-logo.jpg'
fs.copyFileSync(path.join(sourceBrandDir, brandLogo), path.join(targetBrandDir, brandLogo))

const interviews = interviewRows
  .map((row, index) => {
    const filename = logoFilename(row['背景图URL'])
    let imagePath = ''
    if (filename) {
      const candidates = [path.join(sourceBrandDir, filename), path.join(sourceLogoDir, filename)]
      const source = candidates.find((candidate) => fs.existsSync(candidate))
      if (source) {
        const destinationDir = source.includes('/brand/') ? targetBrandDir : targetLogoDir
        const destinationFolder = source.includes('/brand/') ? 'brand' : 'school-logos'
        fs.copyFileSync(source, path.join(destinationDir, filename))
        imagePath = `/assets/case-library/${destinationFolder}/${filename}`
      }
    }
    return {
      id: `interview-${index + 1}`,
      subject: row['专访对象'],
      summary: row['简介'],
      imagePath,
      url: row['专访链接'],
      weight: Number(row['展示权重']) || 0,
      uploadTime: normalizeDate(row['上传时间']),
      tags: splitTags(row['标签'])
    }
  })
  .sort((left, right) => right.weight - left.weight || right.uploadTime.localeCompare(left.uploadTime))

const pageConfig = Object.fromEntries(
  configRows.filter((row) => yes(row.enabled)).map((row) => [row.config_key, row.config_value])
)

for (const filename of ['wechat-qr-v2.jpg', 'form-qr-v2.jpg']) {
  fs.copyFileSync(path.join(sourceQrDir, filename), path.join(targetQrDir, filename))
}

const generated = `// Auto-generated from the four Feishu CSV exports.\n// Re-run: npm run import:cases -- /path/to/csv-folder\nimport type { CaseRecord, InterviewRecord, SchoolRecord } from '../models'\n\nexport const caseRecords: CaseRecord[] = ${JSON.stringify(caseRecords, null, 2)}\n\nexport const schools: SchoolRecord[] = ${JSON.stringify(schools, null, 2)}\n\nexport const interviews: InterviewRecord[] = ${JSON.stringify(interviews, null, 2)}\n\nexport const pageConfig: Record<string, string> = ${JSON.stringify(pageConfig, null, 2)}\n`

const outputPath = path.join(projectDir, 'src/data/case-library.generated.ts')
fs.writeFileSync(outputPath, generated)

console.log(JSON.stringify({ sourceDir, outputPath, cases: caseRecords.length, schools: schools.length, interviews: interviews.length, configs: Object.keys(pageConfig).length }, null, 2))
