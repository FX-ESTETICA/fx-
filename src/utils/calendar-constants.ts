export type ViewType = 'day' | 'week' | 'month' | 'year'

export interface CalendarEvent {
  id: string
  "服务项目": string
  "会员信息"?: string
  "服务日期": string
  "开始时间": string
  "持续时间": number
  "背景颜色": string
  "备注"?: string
  "金额_FANG"?: number
  "金额_SARA"?: number
  "金额_DAN"?: number
  "金额_ALEXA"?: number
  "金额_FEDE"?: number
}

export interface StaffMember {
  id: string
  name: string
  role: string
  avatar: string
  color: string
  bgColor: string
  hidden?: boolean
}

export interface MemberHistoryItem {
  date: string
  service: string
  staff: string
  amount: number
}

export interface Member {
  id?: number
  name: string
  phone: string
  card: string
  level: string
  totalSpend: number
  totalVisits: number
  lastVisit: string
  note: string
  history: MemberHistoryItem[]
}

export const COLOR_OPTIONS = [
  { label: '玫瑰红', value: 'bg-rose-500' },
  { label: '红色', value: 'bg-red-500' },
  { label: '橙色', value: 'bg-orange-500' },
  { label: '琥珀黄', value: 'bg-amber-500' },
  { label: '黄色', value: 'bg-yellow-400' },
  { label: '柠檬绿', value: 'bg-lime-400' },
  { label: '绿色', value: 'bg-green-500' },
  { label: '翡翠绿', value: 'bg-emerald-500' },
  { label: '青色', value: 'bg-teal-400' },
  { label: '水色', value: 'bg-cyan-400' },
  { label: '天蓝色', value: 'bg-sky-400' },
  { label: '蓝色', value: 'bg-blue-500' },
  { label: '靛蓝色', value: 'bg-indigo-500' },
  { label: '紫罗兰', value: 'bg-violet-500' },
  { label: '紫色', value: 'bg-purple-500' },
  { label: '洋红色', value: 'bg-fuchsia-500' },
  { label: '粉红色', value: 'bg-pink-500' },
  { label: '亮玫瑰', value: 'bg-rose-400' },
  { label: '板岩灰', value: 'bg-slate-400' },
  { label: '锌灰色', value: 'bg-zinc-500' },
]

export const STAFF_MEMBERS: StaffMember[] = [
  { id: '1', name: 'FANG', role: '资深美甲师', avatar: 'FA', color: 'border-rose-500', bgColor: 'bg-rose-500/10' },
  { id: '2', name: 'ALEXA', role: '创意设计', avatar: 'AL', color: 'border-emerald-500', bgColor: 'bg-emerald-500/10' },
  { id: '3', name: 'SARA', role: '美睫主管', avatar: 'SA', color: 'border-purple-500', bgColor: 'bg-purple-500/10' },
  { id: '4', name: 'DAN', role: '高级技师', avatar: 'DA', color: 'border-orange-500', bgColor: 'bg-orange-500/10' },
  { id: '5', name: 'FEDE', role: '高级技师', avatar: 'FE', color: 'border-amber-500', bgColor: 'bg-amber-500/10' },
  { id: 'NO', name: 'NO', role: '爽约', avatar: 'NO', color: 'border-zinc-500', bgColor: 'bg-zinc-500/10' },
]

export const SERVICE_CATEGORIES = [
  { title: 'Mani', color: 'from-pink-500/20 to-rose-500/20', items: [
    { name: 'Mn', price: 15, duration: 20 },
    { name: 'Ms', price: 35, duration: 45 },
    { name: 'Rc', price: 60, duration: 90 },
    { name: 'Rt', price: 46, duration: 75 },
    { name: 'Cop', price: 49, duration: 75 },
    { name: 'T.s', price: 8, duration: 5 },
    { name: 'T.g', price: 15, duration: 15 }
  ] },
  { title: 'Piedi', color: 'from-emerald-500/20 to-teal-500/20', items: [
    { name: 'Pn', price: 23, duration: 30 },
    { name: 'Ps', price: 38, duration: 60 }
  ] },
  { title: 'Ceretta', color: 'from-amber-500/20 to-orange-500/20', items: [
    { name: 'Sop', price: 5, duration: 5 },
    { name: 'Baf', price: 5, duration: 5 },
    { name: 'Asc', price: 9, duration: 10 },
    { name: 'Bra', price: 15, duration: 20 },
    { name: 'Gam', price: 24, duration: 30 },
    { name: 'In', price: 15, duration: 20 },
    { name: 'Sch', price: 19, duration: 20 },
    { name: 'Pet', price: 18, duration: 20 },
    { name: 'Pan', price: 6, duration: 10 }
  ] },
  { title: 'Viso', color: 'from-blue-500/20 to-indigo-500/20', items: [
    { name: 'EX.ciglia', price: 65, duration: 120 },
    { name: 'Rt.ciglia', price: 40, duration: 75 },
    { name: 'L.ciglia', price: 50, duration: 60 },
    { name: 'C.ciglia', price: 30, duration: 60 },
    { name: 'L.sop', price: 30, duration: 60 },
    { name: 'C.sop', price: 30, duration: 60 },
    { name: 'P.viso', price: 35, duration: 60 }
  ] }
];

export const I18N = {
  zh: {
    viewLabels: { day: '日视图', week: '周视图', month: '月视图', year: '年视图' } as Record<ViewType, string>,
    startTime: '开始时间',
    duration: '持续时间',
    endTime: '结束时间',
    staff: '服务人员',
    notes: '备注',
    notesPlaceholder: '填写备注信息...',
    choosePrompt: '请选择服务或会员',
    serviceDate: '服务日期',
    amount: '服务金额',
    hourSuffix: ' 时',
    minuteSuffix: ' 分',
    minutesSuffix: ' 分钟',
    dayHeaderFormat: 'M月d日 EEEE',
    headerDayFmt: 'yyyy / MM / dd',
    headerMonthFmt: 'yyyy / MM',
    headerYearFmt: 'yyyy',
    weekdays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  },
  it: {
    viewLabels: { day: 'Giorno', week: 'Settimana', month: 'Mese', year: 'Anno' } as Record<ViewType, string>,
    startTime: 'Ora di inizio',
    duration: 'Durata',
    endTime: 'Ora di fine',
    staff: 'Staff',
    notes: 'Note',
    notesPlaceholder: 'Inserisci note...',
    choosePrompt: 'Seleziona servizio o membro',
    serviceDate: 'Data',
    amount: 'Importo',
    hourSuffix: ' h',
    minuteSuffix: ' min',
    minutesSuffix: ' minuti',
    dayHeaderFormat: 'd MMMM EEEE',
    headerDayFmt: 'dd / MM / yyyy',
    headerMonthFmt: 'MM / yyyy',
    headerYearFmt: 'yyyy',
    weekdays: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
  }
}
