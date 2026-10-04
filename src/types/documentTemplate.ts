export const DOCUMENT_TEMPLATE_GROUPS = ['Embassy', 'Manpower'] as const

export type DocumentTemplateGroup = (typeof DOCUMENT_TEMPLATE_GROUPS)[number]

export type DocumentTemplateLayout = 'table' | 'letter'

export const PRINT_FORMATS = [
  'embassy-list',
  'visa-cancel',
  'mofa',
  'putup',
  'new-putup',
  'notesheet-male',
  'notesheet-female',
  'office-forwarding',
  'undertaking',
] as const

export type PrintFormat = (typeof PRINT_FORMATS)[number]

export const PRINT_FIELDS = [
  'sl',
  'name',
  'passport',
  'profession',
  'year',
  'visaNumber',
  'sponsorName',
  'adviceNo',
  'visaCount',
  'jobTitle',
  'salary',
  'food',
  'rent',
  'tax',
  'welfare',
  'briefing',
  'remarks',
] as const

export type PrintField = (typeof PRINT_FIELDS)[number]

export type TemplateColumn = {
  id: string
  label: string
  sublabel?: string
  field: PrintField
  width?: string
  span?: number
}

export type TemplateStamp = {
  title: string
  caption: string
}

export type DocumentTemplate = {
  id: string
  tenantId: string
  name: string
  group: DocumentTemplateGroup
  format: PrintFormat
  layout: DocumentTemplateLayout
  direction: 'rtl' | 'ltr'
  title: string
  licenseNo: string
  country: string
  declaration: string
  headerRows: TemplateColumn[][]
  stamps: TemplateStamp[]
  letterIntro: string
  letterItems: string[]
  createdAt: string
  updatedAt: string
}

export type DocumentTemplateDraft = {
  name: string
  group: DocumentTemplateGroup
  format?: PrintFormat
  layout: DocumentTemplateLayout
  direction: 'rtl' | 'ltr'
  title: string
  licenseNo: string
  country?: string
  declaration?: string
  headerRows: TemplateColumn[][]
  stamps?: TemplateStamp[]
  letterIntro?: string
  letterItems?: string[]
}

export type PrintPassengerRow = {
  id: string
  sl: number
  name: string
  passport: string
  profession: string
  year: string
  visaNumber: string
  sponsorName: string
  adviceNo: string
  visaCount: string
  jobTitle: string
  salary: string
  food: string
  rent: string
  tax: string
  welfare: string
  briefing: string
  remarks: string
}

export const PRINT_FIELD_LABELS: Record<PrintField, string> = {
  sl: 'Serial',
  name: 'Name',
  passport: 'Passport',
  profession: 'Profession',
  year: 'Year',
  visaNumber: 'Visa number',
  sponsorName: 'Sponsor',
  adviceNo: 'Advice no.',
  visaCount: 'Visa count',
  jobTitle: 'Job title',
  salary: 'Salary',
  food: 'Food',
  rent: 'Rent',
  tax: 'Tax',
  welfare: 'Welfare fee',
  briefing: 'Briefing',
  remarks: 'Remarks',
}

export function embassyHeaderRows(): TemplateColumn[][] {
  return [
    [
      { id: 'profession', label: 'المهنة', sublabel: 'Profession', field: 'profession' },
      { id: 'year', label: 'التاريخ', sublabel: 'Year', field: 'year', width: '90px' },
      {
        id: 'visa',
        label: 'رقم التأشيرة',
        sublabel: 'Visa Number',
        field: 'visaNumber',
        width: '140px',
      },
      { id: 'sponsor', label: 'اسم الكفيل', sublabel: 'Sponsor Name', field: 'sponsorName' },
      {
        id: 'passport',
        label: 'أرقام الجوازات',
        sublabel: 'Passport No.',
        field: 'passport',
        width: '140px',
      },
      { id: 'sl', label: 'ت', sublabel: 'SL', field: 'sl', width: '56px' },
    ],
  ]
}

export function putupHeaderRows(): TemplateColumn[][] {
  return [
    [
      { id: 'sl', label: 'ক্র/নং', field: 'sl', width: '40px' },
      { id: 'name', label: 'বিদেশগামী কর্মীর নাম', field: 'name' },
      { id: 'passport', label: 'পাসপোর্ট নম্বর', field: 'passport' },
      { id: 'visa', label: 'ভিসা নম্বর', field: 'visaNumber' },
      { id: 'advice', label: 'এডভাইস নং', field: 'adviceNo' },
      { id: 'sponsor', label: 'নিয়োগকারীর নাম', field: 'sponsorName' },
      { id: 'count', label: 'ভিসা সংখ্যা', field: 'visaCount' },
      { id: 'job', label: 'পদের নাম', field: 'jobTitle' },
      { id: 'pay', label: 'বেতন ও আনুসাঙ্গিক সুবিধাদি', field: 'salary', span: 3 },
      { id: 'tax', label: 'উৎস আয়করের পরিমান', field: 'tax' },
      { id: 'welfare', label: 'কল্যান ফি এর পরিমাণ', field: 'welfare' },
      { id: 'briefing', label: 'ব্রিফিং প্রদান করা হয়েছে কিনা', field: 'briefing' },
      { id: 'remarks', label: 'মন্তব্য', field: 'remarks' },
    ],
    [
      { id: 'b1', label: '', field: 'sl' },
      { id: 'b2', label: '', field: 'name' },
      { id: 'b3', label: '', field: 'passport' },
      { id: 'b4', label: '', field: 'visaNumber' },
      { id: 'b5', label: '', field: 'adviceNo' },
      { id: 'b6', label: '', field: 'sponsorName' },
      { id: 'b7', label: '', field: 'visaCount' },
      { id: 'b8', label: '', field: 'jobTitle' },
      { id: 'salary', label: 'বেতন', field: 'salary' },
      { id: 'food', label: 'আহার', field: 'food' },
      { id: 'rent', label: 'বি/ভাড়া', field: 'rent' },
      { id: 'b12', label: '', field: 'tax' },
      { id: 'b13', label: '', field: 'welfare' },
      { id: 'b14', label: '', field: 'briefing' },
      { id: 'b15', label: '', field: 'remarks' },
    ],
  ]
}

export function embassyStamps(): TemplateStamp[] {
  return [
    { title: 'الختم', caption: '' },
    { title: 'المستلم', caption: '' },
    { title: 'التعبئة', caption: '' },
    { title: 'المدقق', caption: '' },
    { title: 'التسجيل', caption: '' },
    { title: 'المسئول', caption: '' },
  ]
}

export function putupStamps(): TemplateStamp[] {
  return [
    { title: 'পরীক্ষীত হয়েছে কাগজপত্র সঠিক আছে/নাই', caption: 'সহকারীর সাক্ষর' },
    { title: 'বর্নীত তথ্যাদি আছে/ নাই', caption: 'সহকারী পরিচালকের সাক্ষর' },
    { title: 'বহির্গমনের ছাড়পত্র দেওয়া যায়/ যায় না', caption: 'উপ পরিচালকের সাক্ষর' },
    { title: 'বহির্গমনের ছাড়পত্র দেওয়া যায়/ যায় না', caption: 'পরিচালকের সাক্ষর' },
    { title: 'এজেঞ্চির মালিক/ প্রতিনিধির সাক্ষর', caption: 'মহাপরিচালক' },
  ]
}

export const PUTUP_DECLARATION =
  'বর্নিত কর্মী গ্রুপ ভিসার অন্তর্ভুক্ত নয়। কর্মীদের পাসপোর্ট, ভিসা, চাকুরীর চুক্তিপত্রের বর্নিত বেতন ও শর্তাদি সঠিক আছে। উক্ত বিষয় এ ত্রুটির কারনে কর্মীদের কোনো প্রকার সমস্যা হইলে আমার (প্রতিষ্ঠান) সম্পুর্ন দায় গ্রহণ ও কর্মিদের ক্ষতিপুরন দান করিতে বাধ্য থাকিবে।'

export const NOTESHEET_ITEMS = [
  'ক) রিক্রুটিং এজেন্সী আবেদনপত্র (পতাকা "ক")',
  'খ) আয়কর চালান, কল্যান, ও বীমা ফি এবং স্মার্টকার্ড ফি বাবদ প্রাপ্ত পে-অর্ডারের ফটোকপি (পতাকা "খ")',
  'গ) কর্মীর পুটআপ লিস্ট (পতাকা "গ")',
  'ঘ) রিক্রুটিং এজেন্সী কর্তৃক দাখিলকৃত ৩০০/- টাকার নন-জুডিশিয়াল স্টাম্পে অঙ্গিকারনামা (পতাকা "ঘ")',
  'ঙ) কর্মীর পাসপোর্ট ফটোকপি এবং স্ট্যাম্পকৃত ভিসার ফটোকপি (পতাকা "ঙ")',
  'চ) ইনজাজ কপি (পতাকা "চ")',
  'ছ) চুক্তিপত্রের ফটোকপি (পতাকা "ছ")',
  'জ) কর্মীর প্রশিক্ষণ সনদ (পতাকা "ঝ")',
]
