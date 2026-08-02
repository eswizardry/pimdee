import {
  fingerColumn, isCombining, keyRows, thaiLayoutId, setThaiLayout,
  L_PINKY, L_RING, L_MIDDLE, L_INDEX, R_INDEX, R_MIDDLE, R_RING, R_PINKY,
} from './layouts.js';

// Curriculum. 10 chapters per language; each chapter's drills only use keys
// introduced in that chapter or an earlier one.
//
// A drill is either a plain string or `{ text, focus }`, where `focus` names the
// fingers it trains. Chapter 1 adds one finger pair at a time — you cannot build
// muscle memory for eight keys introduced simultaneously — so its drills all
// carry a focus label. Later chapters work on whole rows and use plain strings.

const TH_KEDMANEE = [
    {
      // Kedmanee home row, by physical key:
      //   a=ฟ  s=ห  d=ก  f=ด  g=เ  │  h=้  j=่  k=า  l=ส  ;=ว  '=ง
      // ่ and ้ are tone marks with no standalone shape, so they are always
      // drilled sitting on a consonant rather than alone.
      id: 1, name: 'แถวเหย้า', en: 'Home row',
      keys: 'ฟหกดเ้่าสวง', goalWpm: 15,
      // Keys arrive as mirrored pairs — the same finger on both hands at once —
      // so each lesson teaches one motion rather than two. Starting on ก/า (the
      // middle fingers) means the very first drill spells a real word, กา.
      drills: [
        { tip: 'home' },
        { focus: 'นิ้วกลางสองมือ · both middle fingers', text: 'กก าา กก าา กา กา กา กา' },
        { tip: 'bumps' },
        { focus: 'นิ้วชี้สองมือ · both index fingers', text: 'ดด ด่ ดด ด่ ดา ด่า ก่า' },
        { focus: 'นิ้วนางสองมือ · both ring fingers', text: 'หห สส หา สา สาห หาส' },
        { focus: 'นิ้วก้อยสองมือ · both pinkies', text: 'ฟฟ วว ฟา วา วาฟ ฟาว' },
        { focus: 'แถวเหย้าครบแปดปุ่ม · all eight home keys', text: 'กา ดา หา ฟา สา วา ก่า ด่า' },
        { focus: 'เอื้อมนิ้วชี้: เ และ ไม้โท · index reaches เ and ้', text: 'เก เด เห เส ก้า ด้า ห้า' },
        { focus: 'ก้อยขวาเอื้อม ง · right pinky reaches ง', text: 'งง งา ดง กง สง วง' },
        { focus: 'คำแรกของคุณ · your first words', text: 'กา หา ดาว สาว เสา เกา' },
        { focus: 'รวมทั้งบท · everything together', text: 'ดาว เก่า ส่ง ห่าง เหงา ว่าง กวาง' },
      ],
    },
    {
      // Top row by physical key:
      //   q=ๆ w=ไ e=ำ r=พ t=ะ │ y=ั u=ี i=ร o=น p=ย [=บ ]=ล
      id: 2, name: 'แถวบน', en: 'Top row',
      keys: 'ๆไำพะัีรนยบล', goalWpm: 15,
      drills: [
        { tip: 'eyesUp' },
        { focus: 'นิ้วชี้ขึ้นแถวบน · index fingers reach up', text: 'พพ กี พพ กี พี ดี พี' },
        { focus: 'นิ้วกลางขึ้นแถวบน · middle fingers', text: 'ำำ รร รำ ำร รำรำ ราำ' },
        { focus: 'นิ้วนางขึ้นแถวบน · ring fingers', text: 'ไไ นน ไน นไ ไนไน นาไ' },
        { focus: 'นิ้วก้อยขึ้นแถวบน · pinkies', text: 'ยย ยา ยำ ๆ ยาๆ ยำๆ' },
        { focus: 'เอื้อมนิ้วชี้: ะ และ ั · index stretch', text: 'กะ กั ดะ ดั พะ พั' },
        { focus: 'ก้อยเอื้อม: บ และ ล · pinky stretch', text: 'บบ ลล บล ลบ บาล ลาบ' },
        { focus: 'แถวบนทั้งแถว · the whole top row', text: 'ๆ ไ ำ พ ะ กั กี ร น ย บ ล' },
        { focus: 'คำแรกของแถวบน · first top-row words', text: 'ไก่ นา ยา บ้าน เรา พี่' },
        { focus: 'รวมกับแถวเหย้า · home row plus top', text: 'น้ำ ไหล ลง ยัง ลำ ราง' },
      ],
    },
    {
      // No new keys: ่ ้ come from the home row and ั ี from the top row. Thai's
      // real difficulty is stacking a vowel and a tone on one consonant, so this
      // chapter drills only that, before the bottom row adds more to remember.
      id: 3, name: 'วรรณยุกต์และสระบน', en: 'Tone marks & upper vowels',
      keys: 'ัี่้', goalWpm: 18,
      drills: [
        { tip: 'accuracy' },
        { focus: 'ไม้เอก ่ · the mai ek tone', text: 'ก่ ด่ ห่ ส่ ว่ น่ ย่' },
        { focus: 'ไม้โท ้ · the mai tho tone', text: 'ก้ ด้ น้ บ้ ล้ ร้' },
        { focus: 'เทียบเอกกับโท · ek against tho', text: 'ก่ ก้ ด่ ด้ น่ น้ ย่ ย้' },
        { focus: 'ไม้หันอากาศ ั · the ั vowel', text: 'กั ดั นั รั ยั วั' },
        { focus: 'สระอี ี · the ี vowel', text: 'กี ดี นี รี ยี สี' },
        { focus: 'สระกับวรรณยุกต์ซ้อนกัน · vowel and tone stacked', text: 'นั่ง ยั้ง ดั่ง สั่ง' },
        { focus: 'คำจริง · real words', text: 'พี่ นี่ ดี สี ยัง เก่ง ร้าน' },
        { focus: 'ประโยคสั้น · a short sentence', text: 'พี่ยังนั่งฟังเสียงน้ำไหล' },
      ],
    },
    {
      // ิ and ื live on the bottom row (b and n), so they are introduced here
      // with the rest of it rather than in the tone-mark chapter.
      id: 4, name: 'แถวล่าง', en: 'Bottom row',
      keys: 'ผปแอิืทมใฝ', goalWpm: 20,
      // Bottom row by physical key:
      //   z=ผ x=ป c=แ v=อ b=ิ │ n=ื m=ท ,=ม .=ใ /=ฝ
      drills: [
        { tip: 'posture' },
        { focus: 'นิ้วชี้ลงแถวล่าง · index fingers reach down', text: 'ออ ทท อท ทอ ทอง ออก' },
        { focus: 'นิ้วกลางลงแถวล่าง · middle fingers', text: 'แแ มม แม มแ แมว มา' },
        { focus: 'นิ้วนางลงแถวล่าง · ring fingers', text: 'ปป ใใ ปใ ใป ปา ใน' },
        { focus: 'นิ้วก้อยลงแถวล่าง · pinkies', text: 'ผผ ฝฝ ผฝ ฝผ ผม ฝน' },
        { focus: 'เอื้อมนิ้วชี้: ิ และ ื · index stretch', text: 'กิ กื ดิ ดื ทิ ทื มิ มื' },
        { focus: 'แถวล่างทั้งแถว · the whole bottom row', text: 'ผ ป แ อ กิ กื ท ม ใ ฝ' },
        { focus: 'คำแรกของแถวล่าง · first bottom-row words', text: 'ผม แม่ พ่อ ไป ทำ มือ' },
        { focus: 'คำเพิ่มเติม · more words', text: 'ปลา แดง ฝน ใหม่ ผัด ทาง' },
        { focus: 'รวมสามแถว · all three rows', text: 'ผมไปทำงานที่บ้านแม่' },
        { focus: 'ประโยคยาวขึ้น · a longer sentence', text: 'แดดแรงแผ่ลงมาไม่หาย' },
      ],
    },
    {
      id: 5, name: 'แถวตัวเลข', en: 'Number row',
      keys: 'ๅ/-ภถุึคตจขช', goalWpm: 22,
      // Number row by physical key:
      //   1=ๅ 2=/ 3=- 4=ภ 5=ถ │ 6=ุ 7=ึ 8=ค 9=ต 0=จ -=ข ==ช
      // ุ and ึ are combining, so they are always drilled on a consonant.
      drills: [
        { tip: 'breaks' },
        { focus: 'นิ้วชี้ขึ้นแถวบนสุด · index fingers reach up', text: 'ภภ ถถ กุ กึ ภา ถา ถุง' },
        { focus: 'นิ้วกลาง: ค และ - · middle fingers', text: 'คค คา คน คำ ค- -ค' },
        { focus: 'นิ้วนาง: ต และ / · ring fingers', text: 'ตต ตา ตัว ต/ /ต ตอ' },
        { focus: 'นิ้วก้อย: ๅ จ ข ช · pinkies', text: 'จจ ขข ชช จะ ขา ชา ๅ' },
        { focus: 'แถวบนสุดทั้งแถว · the whole number row', text: 'ๅ / - ภ ถ กุ กึ ค ต จ ข ช' },
        { focus: 'คำใหม่ · new words', text: 'ใจ จะ จาก ขอ ของ คน ครับ' },
        { focus: 'คำที่มีสระ ุ และ ึ · words with ุ and ึ', text: 'ชอบ ช่วย ถาม ถึง ตอน ต่อ' },
        { focus: 'ผสมทุกแถว · everything so far', text: 'ภาพ ขึ้น คุย ตัว จริง ถาม' },
        { focus: 'ประโยค · a sentence', text: 'ตอนเช้าเขาถามถึงชื่อของผม' },
        { focus: 'ประโยคยาว · a longer sentence', text: 'ตอนนี้ผมกดปุ่มไทยได้ดีขึ้นจริง ๆ' },
      ],
    },
    {
      id: 6, name: 'แถวชิฟต์', en: 'Shift layer',
      keys: 'ฐญฎฑธณศษฬฮฤฆฏโฌ๊๋์ฒฅฺู', goalWpm: 24,
      drills: [
        { tip: 'shift' },
        { focus: 'พยัญชนะชิฟต์ที่ใช้บ่อย · common shifted consonants', text: 'ฐ ญ ธ ณ ศ ษ' },
        { focus: 'พยัญชนะชิฟต์ที่เหลือ · the remaining consonants', text: 'ฎ ฑ ฬ ฮ ฒ ฆ ฏ ฅ' },
        { focus: 'สระและวรรณยุกต์บนชิฟต์ · shifted vowels and tones', text: 'โ ฤ ฌ กู ก๊ ก๋ ก์' },
        { focus: 'คำที่ขึ้นต้นด้วย โ · words starting with โ', text: 'โต โลก โรง โดย โอ่ง' },
        { focus: 'ตัวการันต์ ์ · the silent-letter mark', text: 'สัตว์ ศิลป์ จันทร์ เกียรติ์' },
        { focus: 'วรรณยุกต์ตรีและจัตวา · the ๊ and ๋ tones', text: 'เก๋ เก๊ ตุ๊ก จั๊กจี้ น๊ะ' },
        { focus: 'คำที่มีพยัญชนะชิฟต์ · shifted consonants in words', text: 'ญาติ ฐาน ธรรม ศาลา ณ' },
        { focus: 'ประโยค · a sentence', text: 'โรงเรียนของเราน่าอยู่มาก ๆ' },
      ],
    },
    {
      id: 7, name: 'คำใช้บ่อย', en: 'Common words',
      keys: 'ทั้งหมด', goalWpm: 26,
      drills: [
        // Cluster drills first: the shapes that recur constantly in Thai, so the
        // hand learns them as one movement rather than letter by letter.
        { tip: 'words' },
        { focus: 'สระเ–ีย · the เ–ีย shape', text: 'เรียน เสีย เพียง เดียว เมีย เปรียบ' },
        { focus: 'ไม้หันอากาศ + ง · ั with ง', text: 'ยัง ตั้ง ดัง วัง ทั้ง นั่ง หลัง' },
        { focus: 'สระ–ือ · the –ือ shape', text: 'มือ ชื่อ เมื่อ เรื่อง เหนื่อย เนื้อ' },
        { focus: 'ควบกล้ำ ร · ร clusters', text: 'กร ปร ทร คร พร กราบ ปราบ ครับ' },
        // Thai's equivalent of "tricky words" is spelling, not homophone choice:
        // these are the forms that are most often written wrong. All correct here.
        { focus: 'คำที่มักเขียนผิด · commonly misspelled', text: 'อนุญาต สังเกต กะเพรา โควตา อีเมล' },
        { focus: 'คำที่มักเขียนผิด (ต่อ) · more of them', text: 'เกม ลายเซ็น นานาชาติ ผัดไทย ขนมปัง' },
        { focus: 'ค่ะ กับ คะ · the ค่ะ / คะ trap', text: 'ค่ะ คะ นะคะ ใช่ค่ะ ขอบคุณค่ะ' },
        'ที่ และ ของ ใน การ เป็น มี ได้ ให้ ไม่',
        'ความ จะ กับ ว่า นี้ นั้น เขา เรา คุณ ผม',
        'วัน เวลา ปี เดือน คืน เช้า เย็น บ่าย',
        'กิน นอน เดิน วิ่ง อ่าน เขียน ฟัง พูด',
        'ดี เก่ง สวย งาม ใหญ่ เล็ก สูง ต่ำ',
        'ประเทศ เมือง บ้าน โรงเรียน ตลาด วัด',
        'ขอบคุณ สวัสดี ยินดี ขอโทษ ไม่เป็นไร',
      ],
    },
    {
      // Content-bearing drills: while the hands practise, the sentence is worth
      // reading. Deliberately free of Arabic numerals — those are not on the
      // Kedmanee layout at all, and forcing a script switch belongs in ch.10.
      id: 8, name: 'ประโยคสั้น', en: 'Short sentences',
      keys: 'ทั้งหมด', goalWpm: 28,
      drills: [
        'ช้างเป็นสัตว์บกที่ใหญ่ที่สุดในโลก',
        'ต้นไม้สร้างอาหารเองได้จากแสงแดดและน้ำ',
        'ดวงจันทร์โคจรรอบโลกและทำให้เกิดน้ำขึ้นน้ำลง',
        'น้ำแข็งลอยน้ำได้เพราะเบากว่าน้ำในรูปของเหลว',
        'ผึ้งช่วยผสมเกสรให้พืชหลายชนิดออกผล',
        'ภาษาไทยเขียนติดกันโดยไม่เว้นวรรคระหว่างคำ',
        'หัวใจสูบฉีดเลือดไปทั่วร่างกายตลอดเวลาโดยไม่หยุดพัก',
        'ป่าชายเลนช่วยกันคลื่นและเป็นที่อนุบาลสัตว์น้ำวัยอ่อน',
      ],
    },
    {
      // A mix: factual paragraphs that are worth reading while you type, plus
      // literary ones for a different rhythm. Numeral-free, as in chapter 8.
      id: 9, name: 'ย่อหน้า', en: 'Paragraphs',
      keys: 'ทั้งหมด', goalWpm: 30,
      drills: [
        'ป่าชายเลนเติบโตอยู่ตรงรอยต่อระหว่างแผ่นดินกับทะเล รากที่โผล่พ้นน้ำช่วยดักตะกอนและลดแรงคลื่นก่อนถึงชายฝั่ง ทั้งยังเป็นแหล่งอนุบาลของลูกปลาและปูจำนวนมาก',
        'ดวงอาทิตย์ให้พลังงานแก่สิ่งมีชีวิตเกือบทั้งหมดบนโลก พืชเปลี่ยนแสงให้เป็นอาหารด้วยกระบวนการสังเคราะห์ด้วยแสง แล้วส่งต่อพลังงานนั้นไปยังสัตว์ที่กินพืชเป็นอาหารอีกทอดหนึ่ง',
        'ข้าวเป็นพืชที่คนไทยปลูกกันมายาวนาน ตั้งแต่การตกกล้าไปจนถึงการเก็บเกี่ยว ทุกขั้นตอนต้องอาศัยน้ำ แสงแดด และการดูแลอย่างสม่ำเสมอตลอดทั้งฤดูกาล',
        'ลมหนาวพัดผ่านทุ่งนาในตอนเช้า ต้นข้าวเอนไหวเป็นคลื่นสีทอง ชาวนาเดินออกจากบ้านพร้อมกับแสงแรกของวัน',
        'เมืองเล็ก ๆ ริมแม่น้ำตื่นขึ้นช้ากว่าที่อื่น เรือลำหนึ่งแล่นผ่านไปอย่างเงียบเชียบ ทิ้งริ้วคลื่นไว้ข้างหลัง',
        'การพิมพ์ที่ดีไม่ได้วัดกันที่ความเร็วเพียงอย่างเดียว แต่วัดกันที่จังหวะที่สม่ำเสมอและความแม่นยำที่รักษาไว้ได้ตลอดทั้งย่อหน้า',
        'ห้องสมุดในบ่ายวันอาทิตย์เงียบจนได้ยินเสียงพลิกหน้ากระดาษ แสงแดดลอดผ่านหน้าต่างลงมาเป็นแถบยาวบนพื้นไม้',
      ],
    },
    {
      id: 10, name: 'ผสมสองภาษา', en: 'Bilingual mix', boss: true,
      keys: 'ทั้งหมด', goalWpm: 30,
      drills: [
        'ผมใช้ keyboard แบบ Kedmanee ทุกวัน',
        'ไฟล์ชื่อ report.pdf อยู่ในโฟลเดอร์ Documents',
        'เธอบอกว่า see you tomorrow แล้วก็เดินจากไป',
        'ร้านเปิด 9:00 - 18:00 ทุกวันยกเว้น Sunday',
        'พิมพ์ภาษาไทยแล้วสลับไป English กลางประโยคคือด่านที่ยากที่สุด',
      ],
    },
];

// Pattachote chapters 1–6. Positions come from the verified xkeyboard-config
// table; the wording of the word/sentence drills is authored and wants a review
// by someone who actually types Pattachote. Same mirrored-pair pedagogy as the
// Kedmanee edition: one finger on both hands per drill.
const TH_PATTACHOTE_1_6 = [
  {
    // Pattachote home row, by physical key:
    //   a=้  s=ท  d=ง  f=ก  g=ั  │  h=ี  j=า  k=น  l=เ  ;=ไ  '=ข
    // ก and า sit on the two bumped keys, so the first drill is a real word.
    id: 1, name: 'แถวเหย้า', en: 'Home row',
    keys: '้ทงกัีานเไข', goalWpm: 15,
    drills: [
      { tip: 'home' },
      { focus: 'นิ้วชี้สองมือ · both index fingers', text: 'กก าา กก าา กา กา กา' },
      { tip: 'bumps' },
      { focus: 'นิ้วกลางสองมือ · both middle fingers', text: 'งง นน งน นง งา นา' },
      { focus: 'นิ้วนางสองมือ · both ring fingers', text: 'ทท เท ทา เทา ทาง' },
      { focus: 'นิ้วก้อยสองมือ · both pinkies', text: 'ไท ไง ท้า ก้าง เท้า' },
      { focus: 'เอื้อมนิ้วชี้: ั และ ี · index reaches ั and ี', text: 'กัน ทัน ที นี ทั้ง' },
      { focus: 'ก้อยขวาเอื้อม ข · right pinky reaches ข', text: 'ขา ข้า ขัง เข้า' },
      { focus: 'คำแรกของคุณ · your first words', text: 'กา งา นา ทา ขา เท ทาง' },
      { focus: 'รวมทั้งบท · everything together', text: 'ทาง ทัน กัน ขัง เท้า ข้าง ไท' },
    ],
  },
  {
    // Top row: q=็ w=ต e=ย r=อ t=ร │ y=่ u=ด i=ม o=ว p=แ [=ใ ]=ฌ \=ๅ
    id: 2, name: 'แถวบน', en: 'Top row',
    keys: '็ตยอร่ดมวแใฌๅ', goalWpm: 15,
    drills: [
      { tip: 'eyesUp' },
      { focus: 'นิ้วชี้ขึ้นแถวบน · index fingers reach up', text: 'ออ ดด รร อด ดอ รอ ราด' },
      { focus: 'ไม้เอก อยู่นิ้วชี้ขวา · the ่ tone, right index', text: 'ไก่ ท่า ด่า อ่าง ก่อ' },
      { focus: 'นิ้วกลางขึ้นแถวบน · middle fingers', text: 'ยย มม ยม มย ยา มา ยาม' },
      { focus: 'นิ้วนางขึ้นแถวบน · ring fingers', text: 'ตต วว ตว วต ตา วา ตัว' },
      { focus: 'นิ้วก้อยขึ้นแถวบน · pinkies', text: 'แก่ แม่ ใน แต่ ใต้' },
      { focus: 'แถวบนทั้งแถว · the whole top row', text: 'ก็ ต ย อ ร ก่ ด ม ว แ ใ ฌ ๅ' },
      { focus: 'คำแรกของแถวบน · first top-row words', text: 'ดี มี ตี ยาว วัน ราย' },
      { focus: 'รวมกับแถวเหย้า · home row plus top', text: 'เรา มา ตาม ยาว ดี ต่อ' },
      { focus: 'ประโยคสั้น · a short sentence', text: 'เขามาตามทางเดียวกัน' },
    ],
  },
  {
    // No new keys — ั ี ้ from the home row, ่ ็ from the top row.
    id: 3, name: 'วรรณยุกต์และสระบน', en: 'Tone marks & upper vowels',
    keys: 'ัี่้็', goalWpm: 18,
    drills: [
      { tip: 'accuracy' },
      { focus: 'ไม้เอก ่ · the mai ek tone', text: 'ก่ ท่ ด่ ม่ ย่ ว่' },
      { focus: 'ไม้โท ้ · the mai tho tone', text: 'ก้ ท้ ด้ ม้ ย้ ว้' },
      { focus: 'เทียบเอกกับโท · ek against tho', text: 'ก่ ก้ ท่ ท้ ด่ ด้' },
      { focus: 'ไม้หันอากาศ ั · the ั vowel', text: 'กั ทั ดั มั ยั วั' },
      { focus: 'สระอี ี · the ี vowel', text: 'กี ที ดี มี ยี วี' },
      { focus: 'สระกับวรรณยุกต์ซ้อนกัน · vowel and tone stacked', text: 'นั่ง ยั้ง ตั้ง ดั่ง' },
      { focus: 'คำจริง · real words', text: 'เก่ง ที่ นี่ ดี ร้าน' },
      { focus: 'ประโยคสั้น · a short sentence', text: 'เรายังมาไม่ทัน' },
    ],
  },
  {
    // Bottom row: z=บ x=ป c=ล v=ห b=ิ │ n=ค m=ส ,=ะ .=จ /=พ
    id: 4, name: 'แถวล่าง', en: 'Bottom row',
    keys: 'บปลหิคสะจพ', goalWpm: 20,
    drills: [
      { tip: 'posture' },
      { focus: 'นิ้วชี้ลงแถวล่าง · index fingers reach down', text: 'หห คค สส หค คส หา คา สา' },
      { focus: 'เอื้อมนิ้วชี้: ิ · index reaches ิ', text: 'กิ ทิ ดิ มิ ริ สิ' },
      { focus: 'นิ้วกลางลงแถวล่าง · middle fingers', text: 'ลล ละ ลา มะ วะ' },
      { focus: 'นิ้วนางลงแถวล่าง · ring fingers', text: 'ปป จจ ปจ จป ปา จา ใจ' },
      { focus: 'นิ้วก้อยลงแถวล่าง · pinkies', text: 'บบ พพ บพ พบ บา พา พี่' },
      { focus: 'แถวล่างทั้งแถว · the whole bottom row', text: 'บ ป ล ห กิ ค ส ะ จ พ' },
      { focus: 'คำแรกของแถวล่าง · first bottom-row words', text: 'ปลา หมา คน สวย จริง พี่' },
      { focus: 'คำเพิ่มเติม · more words', text: 'บ้าน พ่อ แม่ ป้า ลม' },
      { focus: 'ประโยค · a sentence', text: 'พ่อกับแม่ไปตลาดมาแล้ว' },
    ],
  },
  {
    // Number row carries Thai digits unshifted:
    //   1== 2=๒ 3=๓ 4=๔ 5=๕ │ 6=ู 7=๗ 8=๘ 9=๙ 0=๐ -=๑ ==๖
    id: 5, name: 'แถวตัวเลข', en: 'Number row',
    keys: '_=๒๓๔๕ู๗๘๙๐๑๖', goalWpm: 22,
    drills: [
      { tip: 'breaks' },
      { focus: 'นิ้วชี้ขึ้นแถวบนสุด · index fingers reach up', text: '๔๔ ๕๕ ๗๗ กู ๔๕ ๗๔' },
      { focus: 'นิ้วกลาง: ๓ และ ๘ · middle fingers', text: '๓๓ ๘๘ ๓๘ ๘๓ ๓๘๓' },
      { focus: 'นิ้วนาง: ๒ และ ๙ · ring fingers', text: '๒๒ ๙๙ ๒๙ ๙๒ ๒๙๒' },
      { focus: 'นิ้วก้อย: ๐ ๑ ๖ · pinkies', text: '๐๐ ๑๑ ๖๖ ๐๑๖ _ =' },
      { focus: 'แถวบนสุดทั้งแถว · the whole number row', text: '_ = ๒ ๓ ๔ ๕ กู ๗ ๘ ๙ ๐ ๑ ๖' },
      { focus: 'คำที่มีสระ ู · words with ู', text: 'ดู รู้ สู้ ปู หู' },
      { focus: 'ตัวเลขไทย · Thai numerals', text: '๑๒๓ ๔๕๖ ๗๘๙ ๐' },
      { focus: 'ผสมตัวเลขกับคำ · numerals in context', text: 'บ้านเลขที่ ๑๒๓' },
      { focus: 'ประโยค · a sentence', text: 'ปี ๒๕๖๘ นี้ดีมาก' },
    ],
  },
  {
    id: 6, name: 'แถวชิฟต์', en: 'Shift layer',
    keys: '๊ฤๆญษึฝซถฒฯฦํ๋ธำณ์ืผชโฆฑฎฏฐภฺศฮฟฉฬุ', goalWpm: 24,
    drills: [
      { tip: 'shift' },
      { focus: 'พยัญชนะชิฟต์ที่ใช้บ่อย · common shifted consonants', text: 'ผ ช ธ ณ ศ ษ' },
      { focus: 'พยัญชนะชิฟต์ที่เหลือ · the remaining consonants', text: 'ฟ ฝ ซ ถ ภ ฮ ฬ' },
      { focus: 'พยัญชนะหายาก · the rarer consonants', text: 'ญ ฐ ฑ ฒ ฎ ฏ ฆ ฉ ฦ ฤ' },
      { focus: 'สระและวรรณยุกต์บนชิฟต์ · shifted vowels and tones', text: 'กำ กุ กึ กื ก๊ ก๋ ก์' },
      { focus: 'คำที่ขึ้นต้นด้วย โ · words starting with โ', text: 'โต โลก โรง โดย ๆ' },
      { focus: 'คำที่มีพยัญชนะชิฟต์ · shifted consonants in words', text: 'ผม ชอบ ถาม ซื้อ ฟัง' },
      { focus: 'ตัวการันต์ ์ · the silent-letter mark', text: 'สัตว์ ศิลป์ จันทร์' },
      { focus: 'ประโยค · a sentence', text: 'ผู้หญิงคนนั้นชื่ออะไร' },
    ],
  },
];

const EN = [
    {
      id: 1, name: 'Home row', en: 'asdf jkl;',
      keys: 'asdfghjkl;', goalWpm: 20,
      drills: [
        { tip: 'home' },
        { focus: 'index fingers · นิ้วชี้', text: 'ff jj ff jj fj fj jf jf' },
        { tip: 'bumps' },
        { focus: 'add middle fingers · เพิ่มนิ้วกลาง', text: 'dd kk dd kk dk kd fdjk' },
        { focus: 'add ring fingers · เพิ่มนิ้วนาง', text: 'ss ll ss ll sl ls sdfl' },
        { focus: 'add pinkies · เพิ่มนิ้วก้อย', text: 'aa ;; a; ;a asdf jkl;' },
        { focus: 'the full home row · แถวเหย้าทั้งแถว', text: 'asdf jkl; asdf jkl; fdsa ;lkj' },
        { focus: 'index reaches g and h · เอื้อมนิ้วชี้', text: 'gg hh gh hg fg jh gf hj' },
        { focus: 'your first words · คำแรกของคุณ', text: 'ask add all fall gash half' },
        { focus: 'everything together · รวมทั้งบท', text: 'a sad lad had a glass flask' },
      ],
    },
    {
      id: 2, name: 'Top row', en: 'qwerty uiop',
      keys: 'qwertyuiop', goalWpm: 20,
      drills: [
        { tip: 'eyesUp' },
        { focus: 'index fingers reach up · นิ้วชี้', text: 'rr uu rr uu ru ur fur rug' },
        { focus: 'middle fingers · นิ้วกลาง', text: 'ee ii ei ie die led kid' },
        { focus: 'ring fingers · นิ้วนาง', text: 'ww oo wo ow low how sow' },
        { focus: 'pinkies · นิ้วก้อย', text: 'qq pp qp pq quip pal quill' },
        { focus: 'index stretch: t and y · เอื้อมนิ้วชี้', text: 'tt yy ty yt they trap the' },
        { focus: 'the whole top row · แถวบนทั้งแถว', text: 'qwer tyui op qwer tyui op' },
        { focus: 'first top-row words · คำแรกของแถวบน', text: 'quiet paper tower proud' },
        { focus: 'home row plus top · รวมกับแถวเหย้า', text: 'the reporter typed a quiet quality report' },
      ],
    },
    {
      id: 3, name: 'Bottom row', en: 'zxcv bnm',
      keys: 'zxcvbnm,./', goalWpm: 24,
      drills: [
        { tip: 'accuracy' },
        { focus: 'index fingers reach down · นิ้วชี้', text: 'vv mm vm mv move van vim' },
        { focus: 'middle fingers · นิ้วกลาง', text: 'cc ,, c, ,c cat, cot, ice,' },
        { focus: 'ring fingers · นิ้วนาง', text: 'xx .. x. .x fix. box. six.' },
        { focus: 'pinkies · นิ้วก้อย', text: 'zz // z/ /z zip zap zoo/' },
        { focus: 'index stretch: b and n · เอื้อมนิ้วชี้', text: 'bb nn bn nb bank barn bin' },
        { focus: 'the whole bottom row · แถวล่างทั้งแถว', text: 'zxcv bnm ,./ zxcv bnm ,./' },
        { focus: 'first bottom-row words · คำแรกของแถวล่าง', text: 'zebra van comb nice mix' },
        { focus: 'all three rows · ครบสามแถว', text: 'nobody expects a lazy zebra to move.' },
      ],
    },
    {
      id: 4, name: 'Number row', en: '1234567890',
      keys: '1234567890-=', goalWpm: 27,
      // Numbers pair inwards from the index fingers, which is the order that
      // keeps each hand anchored while it reaches.
      drills: [
        { tip: 'breaks' },
        { focus: 'index fingers: 4 and 7', text: '44 77 47 74 447 774' },
        { focus: 'middle fingers: 3 and 8', text: '33 88 38 83 338 883' },
        { focus: 'ring fingers: 2 and 9', text: '22 99 29 92 229 992' },
        { focus: 'pinkies: 1 and 0', text: '11 00 10 01 100 001' },
        { focus: 'index stretch: 5 and 6', text: '55 66 56 65 556 665' },
        { focus: 'the whole number row', text: '1234 5678 90 -= 1234' },
        { focus: 'numbers in context', text: 'room 101, gate 7, seat 22' },
        { focus: 'dates', text: 'in 1984 he wrote 3 books' },
        { focus: 'arithmetic', text: '12 and 30 make 42, then 7 - 4 = 3' },
        { focus: 'phone numbers', text: 'call 02-555-1234 before 1800' },
      ],
    },
    {
      id: 5, name: 'Punctuation', en: 'shift layer',
      keys: '!?"\'();:', goalWpm: 30,
      drills: [
        { tip: 'posture' },
        '!? "" \'\' () ;: !? ""',
        'wait! really? yes, really.',
        '"stop," he said; nobody moved.',
        "it's fine (mostly); keep going!",
        'who? what? when? where? why?',
        '"typing," she said, "is a rhythm."',
        'ready? set. go! (no pressure)',
      ],
    },
    {
      // A mechanic, not a key set: shift applied to letters already known. There
      // is no sensible order in which to "introduce" individual capitals, so the
      // within-chapter ordering rule does not apply here.
      id: 6, name: 'Capitals', en: 'shift keys', mechanic: true,
      keys: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', goalWpm: 32,
      drills: [
        { tip: 'shift' },
        'Aa Bb Cc Dd Ee Ff Gg Hh',
        'Bangkok Chiang Mai Phuket',
        'Monday Tuesday Wednesday',
        'The Quick Brown Fox Jumps',
        'January March July October',
        'Anna and Ben left for Berlin.',
        'The Pacific Ocean is the largest on Earth.',
      ],
    },
    {
      id: 7, name: 'Common words', en: 'top 100',
      keys: 'all', goalWpm: 35,
      drills: [
        { tip: 'words' },
        { focus: 'the most common letter patterns', text: 'the and ing tion est ent ion for' },
        { focus: 'longer patterns', text: 'ould ough ight sion ment ness able' },
        { focus: 'high-frequency endings', text: 'ver ith ate ell ill all ong ing' },
        { focus: 'tricky words: the homophone traps', text: "their they're there its it's" },
        { focus: 'tricky words: easily confused', text: 'lose loose desert dessert affect effect' },
        { focus: 'tricky words: principle and the rest', text: 'principle principal weather whether' },
        { focus: 'tricky words: commonly misspelled', text: 'definitely separate receive achieve necessary' },
        'the of and to in is you that it he',
        'was for on are as with his they at',
        'be this have from or one had by word',
        'what were we when your can said there',
        'about out many then them these so some',
        'people work first only think also back',
        'because through between another without',
      ],
    },
    {
      id: 8, name: 'Short sentences', en: 'full keyboard',
      keys: 'all', goalWpm: 38,
      drills: [
        'The Pacific is the largest ocean on Earth.',
        'Light from the sun takes about 8 minutes to reach us.',
        'Water expands when it freezes, which is why ice floats.',
        'Bamboo can grow almost a metre in a single day.',
        'The Thai alphabet has 44 consonants and 32 vowel forms.',
        'A hummingbird beats its wings about 50 times a second.',
        'Honey found in ancient tombs was still safe to eat.',
        'Accuracy first; speed is the reward that follows.',
      ],
    },
    {
      id: 9, name: 'Paragraphs', en: 'endurance',
      keys: 'all', goalWpm: 42,
      drills: [
        'The Pacific Ocean covers about a third of the surface of the planet. Its deepest point lies nearly eleven kilometres down, far enough that the pressure there would crush almost anything built to float.',
        'The morning light moved slowly across the wooden floor. Somewhere below, a door opened and closed, and the building began the long business of waking up.',
        'Good typing is not about raw speed. It is about an even rhythm, a light touch, and the discipline to keep your eyes on the line ahead rather than on your hands.',
        'She had learned two keyboards in the same year, and for months her fingers argued with each other. Then one afternoon the argument simply stopped, and both layouts felt like one.',
        'A quiet library in the late afternoon is the best place to measure progress. There is nothing to hear except paper, and nothing to do except the next line.',
      ],
    },
    {
      id: 10, name: 'Bilingual mix', en: 'boss drill', boss: true,
      keys: 'all', goalWpm: 42,
      drills: [
        'The file is named รายงาน.pdf in Documents',
        'She said สวัสดี and then switched to English',
        'Meet me at สยาม station at 18:00 sharp',
        'Type ขอบคุณ, then type thank you, then repeat',
        'Switching scripts mid-sentence คือทักษะที่ต้องฝึกแยกต่างหาก',
      ],
    },
];

// Arcade word pools.
export const ARCADE_WORDS = {
  th: ['น้ำ', 'ฝน', 'กบ', 'ลม', 'ไฟ', 'ดาว', 'บ้าน', 'แมว', 'หมา', 'ปลา', 'ต้นไม้', 'ทะเล', 'ภูเขา', 'เมฆ', 'ข้าว', 'ถนน', 'ครู', 'เพื่อน', 'ยิ้ม', 'วิ่ง'],
  en: ['river', 'storm', 'cloud', 'stone', 'light', 'forest', 'window', 'bridge', 'silver', 'garden', 'winter', 'candle', 'market', 'thunder', 'island', 'shadow', 'copper', 'meadow', 'lantern', 'harbor'],
};

// Eyes-up mode: public-domain Thai verse + English poetry, split into lines.
export const TRACKS = [
  {
    id: 'klon-1', lang: 'th',
    title: 'กลอนสุภาพ · บทที่ ๑',
    sub: 'Public-domain Thai verse · 88 bpm',
    bpm: 88,
    lines: [
      'เมื่อลมพัดผ่านทุ่งข้าวยามเย็น',
      'ใบไม้ร่วงลงทีละใบอย่างเงียบงัน',
      'ปลิวไปตามสายน้ำที่ไหลเอื่อย',
      'ทิ้งเงาไว้บนผิวน้ำเพียงครู่เดียว',
      'ฟ้าค่อยเปลี่ยนสีจากทองเป็นคราม',
      'นกกลับรังก่อนแสงสุดท้ายจะลา',
      'คืนหนึ่งผ่านไปอย่างไม่มีเสียง',
      'เช้าใหม่มาถึงพร้อมลมอีกครั้ง',
    ],
  },
  {
    id: 'klon-2', lang: 'th',
    title: 'กลอนสุภาพ · บทที่ ๒',
    sub: 'Public-domain Thai verse · 72 bpm',
    bpm: 72,
    lines: [
      'ดาวดวงหนึ่งลอยอยู่เหนือหลังคาบ้าน',
      'แสงอ่อนนวลส่องลงมาถึงลานดิน',
      'เด็กคนหนึ่งนั่งนับดาวจนหลับไป',
      'ความฝันพาเขาข้ามภูเขาลูกใหญ่',
      'ตื่นขึ้นมาก็ยังเป็นเช้าวันเดิม',
      'แต่ใจนั้นได้เดินทางไปไกลแล้ว',
    ],
  },
  {
    id: 'en-1', lang: 'en',
    title: 'Stopping by Woods',
    sub: 'Public domain · Robert Frost · 96 bpm',
    bpm: 96,
    lines: [
      'Whose woods these are I think I know.',
      'His house is in the village though;',
      'He will not see me stopping here',
      'To watch his woods fill up with snow.',
      'The woods are lovely, dark and deep,',
      'But I have promises to keep,',
      'And miles to go before I sleep.',
    ],
  },
];

// ── Travel drills ──────────────────────────────────────────────────────────
// One finger moving up and down its own column. Row-learning chapters get one
// per hand, generated from the finger map rather than written out, so they stay
// correct if a layout ever changes.
//
// Row indices are the keyboard's own: 0 = number row, 1 = top, 2 = home,
// 3 = bottom. A chapter only travels the rows its learner has met.
const TRAVEL_ROWS = { 2: [1, 2], 4: [1, 2, 3], 5: [0, 1, 2, 3] };
const HANDS = [
  { fingers: [L_PINKY, L_RING, L_MIDDLE, L_INDEX], th: 'ไล่นิ้วมือซ้าย', en: 'travel: left hand' },
  { fingers: [R_INDEX, R_MIDDLE, R_RING, R_PINKY], th: 'ไล่นิ้วมือขวา', en: 'travel: right hand' },
];

/** A tone mark cannot ride alone, so give it a neutral consonant to sit on. */
const carrier = (lang, g) => (lang === 'th' && isCombining(g) ? `ก${g}` : g);

/** Every glyph taught up to and including `chapterId`, within one curriculum. */
function taughtGlyphs(curriculum, chapterId) {
  const set = new Set();
  for (const ch of curriculum) {
    if (ch.id > chapterId) break;
    for (const k of ch.keys) set.add(k);
  }
  return set;
}

function travelDrills(lang, chapterId, curriculum) {
  const rows = TRAVEL_ROWS[chapterId];
  if (!rows) return [];
  // A column may run through keys the learner has not met yet — the top row
  // holds ฃ and [ ] \ long before any chapter introduces them — so travel only
  // covers what has actually been taught.
  const taught = taughtGlyphs(curriculum, chapterId);
  return HANDS.map(({ fingers, th, en }) => ({
    focus: `${th} · ${en}`,
    text: fingers
      .map((f) => fingerColumn(lang, f, rows)
        .filter((g) => taught.has(g))
        .map((g) => carrier(lang, g)).join(''))
      .filter(Boolean)
      .join(' '),
  }));
}

// Splice the generated travel drills onto the end of each row chapter. Thai has
// two curricula, and the generator reads the *active* layout, so each is built
// with its own layout switched in.
for (const [lang, layout, curriculum] of [
  ['th', 'kedmanee', TH_KEDMANEE],
  ['th', 'pattachote', TH_PATTACHOTE_1_6],
  ['en', null, EN],
]) {
  const restore = layout ? setThaiLayout(layout) : null;
  for (const ch of curriculum) {
    if (TRAVEL_ROWS[ch.id]) ch.drills = ch.drills.concat(travelDrills(lang, ch.id, curriculum));
  }
  if (restore) setThaiLayout('kedmanee');
}

/**
 * Dynamic Practice: a drill built from the keys you actually miss.
 *
 * Each weak key is repeated in a short burst and then interleaved with settled
 * keys, because a wall of nothing but your worst key trains frustration rather
 * than accuracy. `weak` is the output of store.weakKeys(lang).
 */
export function dynamicDrill(lang, weak, settled = [], minLength = 48) {
  const rows = keyRows(lang);
  const glyphOf = (id) => {
    for (const row of rows) {
      const k = row.keys.find((key) => key.id === id);
      if (k) return k.glyph;
    }
    return id === 'space' ? null : null;
  };

  const bad = weak.map((w) => glyphOf(w.id)).filter(Boolean).map((g) => carrier(lang, g));
  if (!bad.length) return null;

  const good = settled.map(glyphOf).filter(Boolean)
    .filter((g) => !isCombining(g)).map((g) => carrier(lang, g));
  const mateFor = (i) => good[i % good.length] || bad[(i + 1) % bad.length];

  // Keep cycling burst → interleave → mixed until the drill is long enough to be
  // worth running. One weak key would otherwise produce a nine-character drill.
  const groups = [];
  const len = () => groups.join(' ').length;
  for (let cycle = 0; len() < minLength && cycle < 12; cycle++) {
    bad.forEach((g) => groups.push(g.repeat(3)));                     // burst
    bad.forEach((g, i) => groups.push(`${g}${mateFor(i + cycle)}${g}`)); // interleave
    if (bad.length > 1) groups.push(bad.join(''));                    // all together
  }
  // Trim whole groups only — slicing mid-string could orphan a Thai tone mark.
  while (groups.length > 1 && len() > minLength * 2.5) groups.pop();
  return groups.join(' ');
}

// Chapters 7–10 are position-independent (common words, sentences, paragraphs,
// bilingual), so both Thai layouts share the same objects.
const TH_PATTACHOTE = [...TH_PATTACHOTE_1_6, ...TH_KEDMANEE.slice(6)];

export const CHAPTERS = { th: TH_KEDMANEE, th_pat: TH_PATTACHOTE, en: EN };

/** The curriculum for a language, resolved through the active Thai layout. */
export const chapters = (lang) =>
  (lang === 'th' ? (thaiLayoutId() === 'pattachote' ? TH_PATTACHOTE : TH_KEDMANEE) : EN);

export const chapter = (lang, id) => chapters(lang).find((c) => c.id === id) || chapters(lang)[0];

const drillAt = (lang, chId, drillIx) => {
  const ch = chapter(lang, chId);
  return ch.drills[Math.max(0, Math.min(drillIx, ch.drills.length - 1))];
};

/** A drill is a bare string, `{ text, focus }`, or `{ tip }` — a teaching card. */
export const drillText = (lang, chId, drillIx) => {
  const d = drillAt(lang, chId, drillIx);
  if (typeof d === 'string') return d;
  return d.tip ? null : d.text;
};

/** What this drill trains, or null for chapters that work on a whole row. */
export const drillFocus = (lang, chId, drillIx) => {
  const d = drillAt(lang, chId, drillIx);
  return typeof d === 'string' ? null : d.focus || null;
};

/** The tip id for a teaching card, or null when this is an ordinary drill. */
export const drillTip = (lang, chId, drillIx) => {
  const d = drillAt(lang, chId, drillIx);
  return typeof d === 'string' ? null : d.tip || null;
};

/** Drills that are actually typed — tips carry no stars. */
export const typedDrillCount = (lang, chId) =>
  chapter(lang, chId).drills.filter((d) => typeof d === 'string' || !d.tip).length;

export const drillCount = (lang, chId) => chapter(lang, chId).drills.length;
