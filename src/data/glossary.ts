export interface GlossaryEntry {
  id: string
  label: string
  aliases: string[]
  summary: string
  example: string
  relatedTerms: string[]
}

export type GlossaryToken =
  | { type: 'text'; value: string }
  | { type: 'term'; value: string; termId: string }

export const glossaryEntries: GlossaryEntry[] = [
  {
    id: 'fretboard',
    label: '指板',
    aliases: ['吉他指板'],
    summary: '琴颈正面由琴弦和品丝组成的区域。按弦位置决定实际发出的音高。',
    example: '同一个 C 可以出现在指板上的多个位置。',
    relatedTerms: ['fret', 'position'],
  },
  {
    id: 'fret',
    label: '品格',
    aliases: [],
    summary: '相邻两根品丝之间的位置。向琴身方向移动一品，音高升高一个半音。',
    example: '空弦记作 0 品，第 1 品比空弦高一个半音。',
    relatedTerms: ['semitone', 'fretboard'],
  },
  {
    id: 'position',
    label: '把位',
    aliases: ['开放把位', '中把位', '高把位'],
    summary: '左手在指板上活动的一段连续品格范围，用来组织指法和减少大幅移动。',
    example: '开放把位通常覆盖空弦到第 4 品。',
    relatedTerms: ['fretboard', 'fret'],
  },
  {
    id: 'tuning',
    label: '调弦',
    aliases: ['定弦'],
    summary: '规定每根空弦音高的方式。调弦改变后，同一品格对应的音名也会改变。',
    example: '标准调弦从 6 弦到 1 弦是 E A D G B E。',
    relatedTerms: ['fretboard', 'semitone'],
  },
  {
    id: 'root-note',
    label: '根音',
    aliases: ['调内根音'],
    summary: '音阶或和弦的中心音，也是名称的来源。其他音通常用它作为参照。',
    example: 'C 大调音阶和 C 和弦的根音都是 C。',
    relatedTerms: ['major-scale', 'scale-degree'],
  },
  {
    id: 'semitone',
    label: '半音',
    aliases: [],
    summary: '十二平均律中最小的常用音高距离，在吉他上等于相邻两个品格。',
    example: 'C 到 C#、E 到 F 都相差一个半音。',
    relatedTerms: ['fret', 'interval', 'accidental'],
  },
  {
    id: 'octave',
    label: '八度',
    aliases: ['同音八度'],
    summary: '音名相同、音区不同的两个音之间的距离，相隔 12 个半音。',
    example: 'C3 和 C4 音名相同，C4 比 C3 高一个八度。',
    relatedTerms: ['interval', 'semitone'],
  },
  {
    id: 'interval',
    label: '音程',
    aliases: [],
    summary: '两个音之间的音高距离。名称同时描述级数关系和半音数量。',
    example: 'C 到 G 是纯五度，横跨五个音名并相隔 7 个半音。',
    relatedTerms: ['major-third', 'perfect-fourth', 'perfect-fifth', 'octave'],
  },
  {
    id: 'major-third',
    label: '大三度',
    aliases: [],
    summary: '由 4 个半音构成的三度音程，常形成大三和弦明亮感的关键部分。',
    example: 'C 到 E 是大三度。',
    relatedTerms: ['interval', 'semitone'],
  },
  {
    id: 'perfect-fourth',
    label: '纯四度',
    aliases: [],
    summary: '由 5 个半音构成的四度音程。标准调弦中，多数相邻琴弦相隔纯四度。',
    example: 'E 到 A 是纯四度。',
    relatedTerms: ['interval', 'tuning'],
  },
  {
    id: 'perfect-fifth',
    label: '纯五度',
    aliases: [],
    summary: '由 7 个半音构成的五度音程，是大、小三和弦中很稳定的骨架音程。',
    example: 'C 到 G 是纯五度。',
    relatedTerms: ['interval', 'root-note'],
  },
  {
    id: 'minor-seventh',
    label: '小七度',
    aliases: [],
    summary: '由 10 个半音构成的七度音程，常见于属七和弦与布鲁斯语汇。',
    example: 'C 到 Bb 是小七度。',
    relatedTerms: ['interval', 'accidental'],
  },
  {
    id: 'scale-degree',
    label: '音级',
    aliases: ['目标音级'],
    summary: '某个音在音阶中的顺序编号，以根音为第 1 级。',
    example: '在 C 大调中，C 是 1 级，E 是 3 级，G 是 5 级。',
    relatedTerms: ['root-note', 'major-scale'],
  },
  {
    id: 'major-scale',
    label: '大调',
    aliases: ['大调音阶'],
    summary: '按“全全半全全全半”的间隔排列出的七声音阶，听感通常稳定、明亮。',
    example: 'C 大调由 C D E F G A B 组成。',
    relatedTerms: ['scale', 'root-note', 'scale-degree', 'semitone'],
  },
  {
    id: 'scale',
    label: '音阶',
    aliases: [],
    summary: '按音高顺序组织的一组音。音阶提供旋律材料，也帮助理解一个调里的稳定音和倾向音。',
    example: 'C 大调音阶依次是 C、D、E、F、G、A、B。',
    relatedTerms: ['root-note', 'scale-degree', 'major-scale', 'natural-minor-scale'],
  },
  {
    id: 'chord',
    label: '和弦',
    aliases: [],
    summary: '三个或更多不同音高按一定关系组合形成的声音结构，通常围绕一个根音命名。',
    example: 'C 大三和弦由 C、E、G 三个音组成。',
    relatedTerms: ['root-note', 'interval', 'major-triad', 'minor-triad'],
  },
  {
    id: 'natural-minor-scale',
    label: '自然小调',
    aliases: ['自然小调音阶'],
    summary: '按“全半全全半全全”排列的七声音阶，常带有较内敛或暗色的听感。',
    example: 'A 自然小调由 A、B、C、D、E、F、G 组成。',
    relatedTerms: ['scale', 'root-note', 'semitone'],
  },
  {
    id: 'minor-pentatonic-scale',
    label: '小五声音阶',
    aliases: [],
    summary: '由五个音构成的常用小调音阶，省略了容易产生强烈半音冲突的音，便于即兴。',
    example: 'A 小五声音阶是 A、C、D、E、G。',
    relatedTerms: ['scale', 'natural-minor-scale', 'minor-third'],
  },
  {
    id: 'major-triad',
    label: '大三和弦',
    aliases: [],
    summary: '由根音、大三度和纯五度组成的三音和弦，通常具有明亮、稳定的色彩。',
    example: 'C 大三和弦由 C、E、G 组成。',
    relatedTerms: ['chord', 'root-note', 'major-third', 'perfect-fifth'],
  },
  {
    id: 'minor-triad',
    label: '小三和弦',
    aliases: [],
    summary: '由根音、小三度和纯五度组成的三音和弦，与大三和弦相比常显得更内敛。',
    example: 'A 小三和弦由 A、C、E 组成。',
    relatedTerms: ['chord', 'root-note', 'minor-third', 'perfect-fifth'],
  },
  {
    id: 'dominant-seventh-chord',
    label: '属七和弦',
    aliases: [],
    summary: '在大三和弦上加入小七度形成的四音和弦，具有明显的紧张感和解决倾向。',
    example: 'G7 由 G、B、D、F 组成，常解决到 C 和弦。',
    relatedTerms: ['chord', 'major-third', 'perfect-fifth', 'minor-seventh'],
  },
  {
    id: 'minor-third',
    label: '小三度',
    aliases: [],
    summary: '由 3 个半音构成的三度音程，是小三和弦产生小调色彩的关键。',
    example: 'A 到 C 是小三度。',
    relatedTerms: ['interval', 'semitone', 'minor-triad'],
  },
  {
    id: 'natural-note',
    label: '自然音',
    aliases: ['自然音名'],
    summary: '不带升号或降号的七个基本音名：A、B、C、D、E、F、G。',
    example: 'C 是自然音，C# 不是自然音。',
    relatedTerms: ['accidental'],
  },
  {
    id: 'accidental',
    label: '升降号',
    aliases: ['升号', '降号'],
    summary: '临时或固定改变音高的记号。升号 # 升高半音，降号 b 降低半音。',
    example: 'C# 比 C 高一个半音，Bb 比 B 低一个半音。',
    relatedTerms: ['semitone', 'natural-note'],
  },
]

export const glossaryById = new Map(glossaryEntries.map((entry) => [entry.id, entry]))

const glossaryMatches = glossaryEntries
  .flatMap((entry) => [entry.label, ...entry.aliases].map((value) => ({ value, termId: entry.id })))
  .sort((a, b) => b.value.length - a.value.length)

export function tokenizeGlossaryText(text: string): GlossaryToken[] {
  const tokens: GlossaryToken[] = []
  let plainText = ''
  let cursor = 0

  const flushPlainText = () => {
    if (!plainText) return
    tokens.push({ type: 'text', value: plainText })
    plainText = ''
  }

  while (cursor < text.length) {
    const match = glossaryMatches.find(({ value }) => text.startsWith(value, cursor))
    if (!match) {
      plainText += text[cursor]
      cursor += 1
      continue
    }

    flushPlainText()
    tokens.push({ type: 'term', value: match.value, termId: match.termId })
    cursor += match.value.length
  }

  flushPlainText()
  return tokens
}
