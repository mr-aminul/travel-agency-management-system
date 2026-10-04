import type { DocumentTemplate, PrintPassengerRow } from '@/types/documentTemplate'
import { PUTUP_DECLARATION } from '@/types/documentTemplate'

type DocumentPaperProps = {
  template: DocumentTemplate
  agencyName: string
  date: string
  rows: PrintPassengerRow[]
}

const BN = '০১২৩৪৫৬৭৮৯'

function bn(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => BN[Number(digit)] ?? digit)
}

function cell(value: string) {
  return value || '\u00a0'
}

export function DocumentPaper({
  template,
  agencyName,
  date,
  rows,
}: DocumentPaperProps) {
  const license = template.licenseNo || '864'
  const agency = agencyName || '—'
  const count = rows.length

  switch (template.format) {
    case 'visa-cancel':
      return (
        <EmbassySheet
          agency={agency}
          license={license}
          date={date}
          rows={rows}
        />
      )
    case 'embassy-list':
      return (
        <EmbassySheet
          agency={agency}
          license={license}
          date={date}
          rows={rows}
          showTotal
        />
      )
    case 'mofa':
      return <MofaSheet rows={rows} />
    case 'putup':
      return (
        <PutupSheet agency={agency} license={license} date={date} rows={rows} />
      )
    case 'new-putup':
      return (
        <NewPutupSheet agency={agency} license={license} date={date} rows={rows} />
      )
    case 'notesheet-female':
      return (
        <Notesheet
          female
          agency={agency}
          license={license}
          date={date}
          rows={rows}
        />
      )
    case 'notesheet-male':
      return (
        <Notesheet agency={agency} license={license} date={date} rows={rows} />
      )
    case 'office-forwarding':
      return (
        <OfficeSheet
          agency={agency}
          license={license}
          count={count}
        />
      )
    case 'undertaking':
      return (
        <UndertakingSheet
          agency={agency}
          license={license}
          date={date}
          rows={rows}
        />
      )
    default:
      return (
        <EmbassySheet
          agency={agency}
          license={license}
          date={date}
          rows={rows}
          showTotal
        />
      )
  }
}

function EmbassySheet({
  agency,
  license,
  date,
  rows,
  showTotal = false,
}: {
  agency: string
  license: string
  date: string
  rows: PrintPassengerRow[]
  showTotal?: boolean
}) {
  return (
    <article className="pd-paper" dir="rtl">
      <h2 className="pd-paper__title">بيان بالجوازات المقدمة</h2>
      <div className="pd-paper__meta">
        <div>
          <p>
            <strong>{license}</strong>
            <span>رقم الرخصة:</span>
          </p>
          <p>
            <strong>{date}</strong>
            <span>التاريخ:</span>
          </p>
        </div>
        <div className="pd-paper__meta-col--end">
          <p>
            <strong>{agency}</strong>
            <span>اسم مقدم الجوازات:</span>
          </p>
          <p>
            <span>التوقيع:</span>
          </p>
        </div>
      </div>
      <table className="pd-paper__table">
        <thead>
          <tr>
            <th>
              المهنة
              <span>Profession</span>
            </th>
            <th>
              التاريخ
              <span>Year</span>
            </th>
            <th>
              رقم التأشيرة
              <span>Visa Number</span>
            </th>
            <th>
              اسم الكفيل
              <span>Sponsor Name</span>
            </th>
            <th>
              أرقام الجوازات
              <span>Passport No.</span>
            </th>
            <th>
              ت<span>SL</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{cell(row.profession)}</td>
              <td>{cell(row.year)}</td>
              <td>{cell(row.visaNumber)}</td>
              <td>{cell(row.sponsorName)}</td>
              <td>{cell(row.passport.toUpperCase())}</td>
              <td>{row.sl}</td>
            </tr>
          ))}
          {showTotal ? (
            <tr>
              <td />
              <td />
              <td />
              <td />
              <td>
                <strong>{rows.length}</strong>
              </td>
              <td>المجموع</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <footer className="pd-paper__stamps">
        <p>: الختم</p>
        <p>: المستلم</p>
        <p>: التعبئة</p>
        <p>: المدقق</p>
        <p>: التسجيل</p>
        <p>: المسئول</p>
      </footer>
    </article>
  )
}

function MofaSheet({ rows }: { rows: PrintPassengerRow[] }) {
  const items = rows.length ? rows : []
  return (
    <article className="pd-paper pd-paper--mofa" dir="ltr">
      {items.length === 0 ? (
        <p className="pd-paper__bangla-head">
          Search a client to print MOFA barcodes.
        </p>
      ) : (
        <div className="pd-mofa-grid">
          {items.map((row) => (
            <div key={row.id} className="pd-mofa-card">
              <Barcode value={row.passport || row.id} />
              <p>{row.passport || row.name}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function Barcode({ value }: { value: string }) {
  const bars = value
    .split('')
    .flatMap((char) => {
      const code = char.charCodeAt(0)
      return [code % 3 === 0 ? 2 : 1, 1, (code % 2) + 1, 1]
    })
  return (
    <div className="pd-barcode" aria-hidden>
      <span className="pd-barcode__text">{value}</span>
      <span className="pd-barcode__bars">
        {bars.map((width, index) => (
          <i
            key={`${value}-${index}`}
            style={{ width: `${width}px` }}
            className={index % 2 === 0 ? 'is-ink' : undefined}
          />
        ))}
      </span>
    </div>
  )
}

function PutupSheet({
  agency,
  license,
  date,
  rows,
}: {
  agency: string
  license: string
  date: string
  rows: PrintPassengerRow[]
}) {
  return (
    <article className="pd-paper" dir="ltr">
      <p className="pd-paper__bangla-head">
        একক বর্হিগমন ছাড়পত্রের আবেদন ফর্ম
        <br />
        নিয়োগকারী দেশের নাম - সৌদি আরব
        <br />
        জমাদানকারী রিক্রুটিং এজেঞ্জীর নাম:
        <strong>
          {' '}
          {agency} (লাইসেন্স নম্বর: {bn(license)})
        </strong>
        <br />
        তারিখ: {bn(date.split('/').join('-'))} ইং
      </p>
      <table className="pd-paper__table pd-paper__table--tiny">
        <thead>
          <tr>
            <th>ক্র/নং</th>
            <th>বিদেশগামী কর্মীর নাম</th>
            <th>পাসপোর্ট নম্বর</th>
            <th>ভিসা নম্বর</th>
            <th>এডভাইস নং</th>
            <th>নিয়োগকারীর নাম</th>
            <th>ভিসা সংখ্যা</th>
            <th>পদের নাম</th>
            <th colSpan={3}>বেতন ও আনুসাঙ্গিক সুবিধাদি</th>
            <th>উৎস আয়করের পরিমান</th>
            <th>কল্যান ফি এর পরিমাণ</th>
            <th>ব্রিফিং প্রদান করা হয়েছে কিনা</th>
            <th>মন্তব্য</th>
          </tr>
          <tr>
            {Array.from({ length: 8 }, (_, index) => (
              <th key={`a-${index}`} />
            ))}
            <th>বেতন</th>
            <th>আহার</th>
            <th>বি/ভাড়া</th>
            <th />
            <th />
            <th />
            <th />
          </tr>
        </thead>
        <tbody>
          {(rows.length ? rows : [emptyRow()]).map((row) => (
            <tr key={row.id}>
              <td>{bn(row.sl)}</td>
              <td>{cell(row.name)}</td>
              <td>{cell(row.passport)}</td>
              <td>{cell(row.visaNumber)}</td>
              <td>{cell(row.adviceNo)}</td>
              <td>{cell(row.sponsorName)}</td>
              <td>{cell(row.visaCount)}</td>
              <td>{cell(row.jobTitle || row.profession)}</td>
              <td>{cell(row.salary)}</td>
              <td>{cell(row.food)}</td>
              <td>{cell(row.rent)}</td>
              <td>{cell(row.tax)}</td>
              <td>{cell(row.welfare)}</td>
              <td>{cell(row.briefing)}</td>
              <td>{cell(row.remarks)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pd-paper__declaration">{PUTUP_DECLARATION}</p>
      <footer className="pd-paper__stamps pd-paper__stamps--five">
        <div>
          <p>পরীক্ষীত হয়েছে কাগজপত্র সঠিক আছে/নাই</p>
          <p>সহকারীর সাক্ষর</p>
        </div>
        <div>
          <p>বর্নীত তথ্যাদি আছে/ নাই</p>
          <p>সহকারী পরিচালকের সাক্ষর</p>
        </div>
        <div>
          <p>বহির্গমনের ছাড়পত্র দেওয়া যায়/ যায় না</p>
          <p>উপ পরিচালকের সাক্ষর</p>
        </div>
        <div>
          <p>বহির্গমনের ছাড়পত্র দেওয়া যায়/ যায় না</p>
          <p>পরিচালকের সাক্ষর</p>
        </div>
        <div>
          <p>এজেঞ্চির মালিক/ প্রতিনিধির সাক্ষর</p>
          <p>মহাপরিচালক</p>
        </div>
      </footer>
    </article>
  )
}

const NEW_PUTUP_ROWS = [
  'Worker SI No.',
  'Company Name',
  'Employee Name',
  'Job Post',
  'Salary',
  'Reg ID',
  'Visa No.',
  'Visa Issue',
  'Visa Expire',
  'Passport No.',
  'Passport Issue',
  'Passport Expire',
  'Date of Birth',
] as const

function NewPutupSheet({
  agency,
  license,
  date,
  rows,
}: {
  agency: string
  license: string
  date: string
  rows: PrintPassengerRow[]
}) {
  const slots = Array.from({ length: 8 }, (_, index) => rows[index])
  const valueFor = (label: string, row?: PrintPassengerRow) => {
    if (!row) return ''
    if (label === 'Worker SI No.') return String(row.sl).padStart(2, '0')
    if (label === 'Company Name') return row.sponsorName
    if (label === 'Employee Name') return row.name.toUpperCase()
    if (label === 'Job Post') return row.profession
    if (label === 'Salary') return row.salary
    if (label === 'Visa No.') return row.visaNumber
    if (label === 'Passport No.') return row.passport.toUpperCase()
    if (label === 'Date of Birth') return row.year
    return ''
  }
  return (
    <article className="pd-paper" dir="ltr">
      <h2 className="pd-paper__title">
        একক বহির্গমন ছাড়পত্রের পুটআপসীট ও ডাটাএন্ট্রি ফরম
      </h2>
      <table className="pd-paper__table pd-paper__table--tiny">
        <tbody>
          <tr>
            <td>নিয়োগকারী দেশের নামঃ</td>
            <td>
              <strong>সৌদি আরব</strong>
            </td>
            <td>আর এল নং</td>
            <td>ভিসার ধরন</td>
            <td>উৎস আয়করের পরিমান জন প্রতিঃ</td>
            <td>
              <strong>৫০০/-</strong>
            </td>
          </tr>
          <tr>
            <td>রিক্রুটিং এজেন্সীর নামঃ</td>
            <td>
              <strong>{agency}</strong>
            </td>
            <td rowSpan={2}>
              <strong>{bn(license)}</strong>
            </td>
            <td rowSpan={2}>
              <strong>সত্যায়িত</strong>
            </td>
            <td>কল্যান ফি পরিমান জনপ্রতিঃ</td>
            <td>
              <strong>৪৫০০/-</strong>
            </td>
          </tr>
          <tr>
            <td>টাকা জমার পারমিট নং</td>
            <td />
            <td>স্মার্ট কার্ড ফি</td>
            <td>
              <strong>২৫০/-</strong>
            </td>
          </tr>
          <tr>
            <td />
            <td />
            <td />
            <td />
            <td>তারিখ</td>
            <td>
              <strong>{bn(date)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
      <table className="pd-paper__table pd-paper__table--tiny">
        <tbody>
          <tr>
            <td>Employee No</td>
            {slots.map((_, index) => (
              <td key={index}>{String(index + 1).padStart(2, '0')}</td>
            ))}
          </tr>
          {NEW_PUTUP_ROWS.map((label) => (
            <tr key={label}>
              <td>{label}</td>
              {slots.map((row, index) => (
                <td key={index}>{cell(valueFor(label, row))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

const MALE_FLAGS = [
  'ক) রিক্রুটিং এজেন্সী আবেদনপত্র (পতাকা "ক")',
  'খ) আয়কর চালান, কল্যান, ও বীমা ফি এবং স্মার্টকার্ড ফি বাবদ প্রাপ্ত পে-অর্ডারের ফটোকপি (পতাকা "খ")',
  'গ) কর্মীর পুটআপ লিস্ট (পতাকা "গ")',
  'ঘ) রিক্রুটিং এজেন্সী কর্তৃক দাখিলকৃত ৩০০/- টাকার নন-জুডিশিয়াল স্টাম্পে অঙ্গিকারনামা (পতাকা "ঘ")',
  'ঙ) কর্মীর পাসপোর্ট ফটোকপি এবং স্ট্যাফিংকৃত ভিসার ফটোকপি (পতাকা "ঙ")',
  'চ) ইনজাজ কপি (পতাকা "চ")',
  'ছ) চুক্তিপত্রের ফটোকপি (পতাকা "ছ")',
  'জ) কর্মীর প্রশিক্ষণ সনদ। (পতাকা "ঝ")',
  'ঝ) কর্মীর ডাটা এন্ট্রি শিট। (পতাকা "ঞ")',
  'ঞ) ড্রাইভিং লাইসেন্স সংযুক্ত। (পতাকা "ট")',
]

const FEMALE_FLAGS = [
  'ক) রিক্রুটিং এজেন্সি আবেদনপত্র (পতাকা “ক“)',
  'খ) আয়কর চালান, কল্যান, ও বীমা ফি এবং স্মার্টকার্ড ফি বাবদ প্রাপ্ত পে-অর্ডারের ফটোকপি (পতাকা “খ“)',
  'গ) পুট-আপ লিস্ট (পতাকা “গ“)',
  'ঘ) রিক্রুটিং এজেন্সি কর্তৃক দাখিলকৃত ৩০০/- টাকার নন-জুডিশিয়াল স্টাম্পে অঙ্গিকারনামা (পতাকা “ঘ“)',
  'ঙ) কর্মীর পাসপোর্ট ফটোকপি এবং স্ট্যাফিংকৃত ভিসার কপি (পতাকা “ঙ“)',
  'চ) ইনজাজ কপি (পতাকা “চ“)',
  'ছ) চুক্তিপত্রের ফটোকপি (পতাকা “ছ“)',
  'জ) রি/এজেন্সি লাইসেন্স নবায়ন বলবত আছে। (পতাকা “জ“)',
  'ঝ) কর্মির প্রশিক্ষন সনদ। (পতাকা “ঝ“)',
  'ঞ) ডাটা এন্ট্রি শিট। (পতাকা “ঞ“)',
  'ট) ড্রাইভিং লাইসেন্স সংযুক্ত। (পতাকা “ট“)',
]

function Notesheet({
  female = false,
  agency,
  license,
  date,
  rows,
}: {
  female?: boolean
  agency: string
  license: string
  date: string
  rows: PrintPassengerRow[]
}) {
  const people = bn(rows.length)
  return (
    <article className="pd-paper pd-paper--letter" dir="ltr">
      <p className="pd-paper__letter-intro">
        {bn(date)} । রিক্রুটিং এজেন্সী {agency} (লাইসেন্স নম্বরঃ {bn(license)}) এর
        ব্যবস্থাপনা পরিচালক সৌদি আরব গামি {people} জন
        {female ? ' মহিলা' : ''} কর্মীর অনুকুলে একক বহির্গমন ছাড়পত্র গ্রহনের জন্য
        আবেদনপত্রসহ নিম্নে বর্ণিত কাগজপত্রাদি দাখিল করেছেন।
      </p>
      <ol className="pd-paper__letter-items">
        {(female ? FEMALE_FLAGS : MALE_FLAGS).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <h3>কর্মীর বিবরণঃ</h3>
      <table className="pd-paper__table pd-paper__table--tiny">
        <thead>
          <tr>
            <th>ক্র/নং</th>
            <th>কর্মীর নাম</th>
            <th>পাসপোর্ট নম্বর</th>
            <th>ভিসা/আইডি নম্বর</th>
            <th>নিয়োগকারীর নাম</th>
            <th>পেশা</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{bn(row.sl)}</td>
              <td>{row.name}</td>
              <td>{row.passport}</td>
              <td>{cell(row.visaNumber)}</td>
              <td>{cell(row.sponsorName)}</td>
              <td>{cell(row.profession)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>প্রশিক্ষণ সনদের বিবরণঃ-</h3>
      <table className="pd-paper__table pd-paper__table--tiny">
        <thead>
          <tr>
            <th>ক্র/নং</th>
            <th>কর্মীর নাম</th>
            <th>প্রশিক্ষন সনদ নং</th>
            <th>ব্যাংকের নাম ও আকাউন্ট নং</th>
            <th>মেডিকেল সেন্টার</th>
            <th>টিটিসির নাম</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.id}-train`}>
              <td>{bn(row.sl)}</td>
              <td>{row.name}</td>
              <td />
              <td />
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>
      <h3>আয়কর চালান, কল্যান ও বীমা ফি এবং স্মার্টকার্ড এর বিবরনীঃ-</h3>
      <p>
        জনসংখ্যা {people} · কল্যান (৩৫০০+১০০০)= ৪৫০০ × {people} ={' '}
        {bn(rows.length * 4500)} · স্মার্ট কার্ড ২৫০ × {people} ={' '}
        {bn(rows.length * 250)} · বীমা ৫০০ × {people} = {bn(rows.length * 500)}
      </p>
      <p className="pd-paper__declaration">
        ভিসার সঠিকতা, ধরন, পেশা, নিষিদ্ধ কোম্পানীর ভিসা ও এনজাজ কপির Advice/Lot এ
        ভিসার সংখ্যা ২৪ এর অধিক ভিসা আছে কি না এ বিষয়ে মতামতের জন্য অনুবাদক
        শাখায় প্রেরন করা হলো।
      </p>
      <p>অনুবাদক</p>
    </article>
  )
}

function OfficeSheet({
  agency,
  license,
  count,
}: {
  agency: string
  license: string
  count: number
}) {
  const people = count ? `${bn(count)} জন` : '..... জন'
  return (
    <article className="pd-paper pd-paper--letter" dir="ltr">
      <p>
        বরাবর
        <br />
        <br />
        মহা-পরিচালক
        <br />
        জনশক্তি কর্মসংস্থান ও প্রশিক্ষণ ব্যুরো,
        <br />
        ৮৯/২ কাকরাইল, ঢাকা-১০০০।
        <br />
        <br />
        দৃষ্টি আকর্ষনঃ পরিচালক (বহির্গমন)
      </p>
      <p>
        <strong>
          বিষয়: সৌদিআরবগামী {people} কর্মীর একক বহির্গমন ছাড়পত্র প্রদানের জন্য
          আবেদন।
        </strong>
      </p>
      <p className="pd-paper__declaration">
        জনাব, বিনীত নিবেদন এই যে, সৌদিআরব গমনেচ্ছু {people} কর্মী তাদের স্ব-স্ব
        উদ্যোগে সংগৃহীত ভিসা, মূলপাসপোর্ট ও চুক্তিপত্রসহ অন্যান্য কাগজপত্রাদি
        আমার রিক্রুটিং এজেন্সী {agency} (আর এল- {bn(license)}) এর মাধ্যমে
        বহির্গমন ছাড়পত্র গ্রহনের জন্য জমা দিয়েছে। কর্মীদের নিকট হতে প্রাপ্ত
        ভিসাসহ নিম্নেবর্ণিত কাগজপত্রাদি এমবস্থায় দাখিল করলাম। ভিসাগুলো আমার
        অফিসে পরীক্ষান্তে সঠিক পাওয়া গিয়েছে। ভিসাগুলো EMPLOYMENT ভিসা। যাহার
        মেয়াদ ০২ (দুই) বছর এবং পরবর্তীতে নবায়নযোগ্য।
      </p>
      <p>সংযুক্তি:</p>
      <ol className="pd-paper__letter-items">
        <li>০১। অঙ্গীকারনামা</li>
        <li>০২। পাসপোর্ট ও ভিসার ফটোকপি।</li>
        <li>০৩। চালান ও পে-অর্ডার এর মূলকপি।</li>
        <li>০৪। প্রশিক্ষন সনদের মূলকপি।</li>
        <li>০৫। উপস্থাপিত (Put Up) তালিকা।</li>
        <li>০৬। কর্মীর ডাটা শীট।</li>
      </ol>
      <p>
        রিক্রুটিং এজেন্সির নামঃ {agency} ({bn(license)})
        <br />
        মালিকের স্বাক্ষর ও সীলঃ
        <br />
        তারিখঃ---------------
      </p>
    </article>
  )
}

function UndertakingSheet({
  agency,
  license,
  date,
  rows,
}: {
  agency: string
  license: string
  date: string
  rows: PrintPassengerRow[]
}) {
  return (
    <article className="pd-paper pd-paper--letter" dir="ltr">
      <p className="pd-paper__bangla-head">
        নিম্নলিখিত সৌদিআরবগামী {bn(rows.length)} জন কর্মী প্রেরণ সংক্রান্ত
        রিক্রুটিং এজেন্সী {agency} (আরএল-{bn(license)}) এর অঙ্গীকারনামা।
      </p>
      <table className="pd-paper__table pd-paper__table--tiny">
        <thead>
          <tr>
            <th>ক্র/নং</th>
            <th>কর্মীর নাম</th>
            <th>পাসপোর্ট নম্বর</th>
            <th>ভিসা নম্বর</th>
            <th>নিয়োগকারীর নাম</th>
            <th>পদের নাম</th>
            <th>অভিবাসন ব্যয়</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{bn(row.sl)}</td>
              <td>{row.name}</td>
              <td>{row.passport}</td>
              <td>{cell(row.visaNumber)}</td>
              <td>{cell(row.sponsorName)}</td>
              <td>{cell(row.profession)}</td>
              <td>1,65,000</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pd-paper__declaration">
        আমি {agency} (আরএল-{bn(license)}) স্বত্ত্বাধিকারী/ব্যবস্থাপনা পরিচালক এই
        মর্মে অঙ্গীকার করছি যে, চাকুরীর উদ্দেশ্যে সৌদিআরব গামী {bn(rows.length)}{' '}
        জন কর্মীর একক বহির্গমন ছাড়পত্র গ্রহণের নিমিত্তে কর্মীদের ভিসা,
        চুক্তিপত্রসহ অন্যান্য প্রয়োজনীয় কাগজপত্রাদি দাখিল করলাম, যা সঠিক আছে।
        তারিখ {bn(date)}।
      </p>
      <h3 className="pd-paper__title">পাতা নং - ২</h3>
      <p className="pd-paper__declaration">
        উপর্যুক্ত কর্মীদের সৌদিআরব বিমানবন্দরে নিয়োগকর্তা বা নিয়োগ কর্তার
        প্রতিনিধি গ্রহণ করবেন এবং বর্ণিত কর্মীগণকে সৌদিআরব ব্যতিত অন্য কোনো
        দেশে প্রেরন করব না মর্মে অঙ্গীকার করছি। বিদেশ গমণের পর কোন কারণে
        কর্মীদের বিমানবন্দর হতে নিয়োগকর্তা গ্রহণ না করে অথবা কর্মীদের ভিসা জাল
        বলে প্রমাণিত হয় তাহলে উক্ত কর্মীর সকল দায়-দায়িত্ব আমি বা আমার রিক্রুটিং
        এজেন্সী বহন করতে বাধ্য থাকব।
      </p>
      <h3 className="pd-paper__title">পাতা নং - ৩</h3>
      <p className="pd-paper__declaration">
        উপর্যুক্ত অঙ্গীকার নামায় বর্ণিত বিষয়ের কোন ব্যত্যয় ঘটলে প্রবাসীকল্যাণ ও
        বৈদেশিক কর্মসংস্থান মন্ত্রণালয় অথবা জনশক্তি কর্মসংস্থান ও প্রশিক্ষণ
        ব্যুরো “বৈদেশিক কর্মসংস্থান ও অভিবাসী আইন-২০১৩” অনুযায়ী যে কোন ব্যবস্থা
        গ্রহণ করতে পারবে। এই অঙ্গীকারনামা আমি স্বেচ্ছায়, স্বজ্ঞানে, সুস্থ
        মস্তিস্কে স্বাক্ষর করলাম।
      </p>
      <p>
        {agency}
        <br />
        স্বাক্ষর ও সীল
        <br />
        {bn(date)}
      </p>
    </article>
  )
}

function emptyRow(): PrintPassengerRow {
  return {
    id: 'blank',
    sl: 1,
    name: '',
    passport: '',
    profession: '',
    year: '',
    visaNumber: '',
    sponsorName: '',
    adviceNo: '',
    visaCount: '',
    jobTitle: '',
    salary: '',
    food: '',
    rent: '',
    tax: '',
    welfare: '',
    briefing: '',
    remarks: '',
  }
}
