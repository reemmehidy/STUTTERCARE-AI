# نشر ستاتر كير على الإنترنت (لينك شغّال دايمًا، من غير تيرمنال)

الفكرة: الموقع بيتحط على سيرفرات مجانية، وبيطلعلك **لينك** تبعته لأي حد. مش لازم جهازك يكون شغّال.

| الجزء | بيروح فين | السعر |
|---|---|---|
| قاعدة البيانات | MongoDB Atlas (موجودة عندك) | مجاني |
| الباك اند (API) | Render | مجاني (له قيود تحت) |
| الفرونت (الموقع) | Cloudflare Pages | مجاني |
| إيميل الـ OTP | Brevo (عن طريق API) | مجاني (باقة يومية) |

> **مهم:** Render المجاني **بيمنع** إرسال الإيميل عن طريق Gmail/SMTP. عشان كده الكود بيستخدم **Brevo API** (عن طريق HTTPS). ما تستخدمش Gmail على Render.

## 1. إيميل Brevo (عشان الـ OTP يوصل فعلًا)
1. اعمل حساب على brevo.com.
2. أضف **Sender** (بريدك) وأكّده من الرسالة اللي توصلك (من قسم Senders).
3. من **SMTP & API** ← **API keys** ← Generate، وانسخ المفتاح.
4. احتفظ بالمفتاح وبريد الـ Sender المؤكّد.

## 2. ارفع المشروع على GitHub
في VS Code Terminal من فولدر المشروع الرئيسي (اللي فيه `backend` و `stuttercare-ai`):
```powershell
git status
git add .
git commit -m "StutterCare v2"
git push
```
اتأكد إن `.env` **مش** ظاهر في `git status` (هو في `.gitignore`). ما ترفعوش أبدًا.

## 3. اسمح لـ Render في MongoDB Atlas
Atlas ← Network Access ← Add IP Address ← **Allow Access from Anywhere** (`0.0.0.0/0`). (Render المجاني IP بتاعه بيتغيّر.)

## 4. انشر الباك اند على Render
1. render.com ← New ← **Blueprint** ← اربط حساب GitHub واختار الريبو.
2. هيقرأ ملف `render.yaml` تلقائيًا. املا المتغيرات:
   - `MONGO_URI` = رابط Atlas (مع اسم قاعدة البيانات `stuttercare`).
   - `BREVO_API_KEY` = مفتاح Brevo.
   - `MAIL_FROM` = `StutterCare AI <بريد_الـSender_المؤكّد>`.
   - `CLIENT_URL` = سيبه مؤقتًا `http://localhost:5173` (هنغيّره في خطوة 6).
3. اضغط Apply. بعد دقايق هيطلع لينك زي `https://stuttercare-api.onrender.com`.
4. افتح `https://...onrender.com/api/health`، لازم يظهر `{"status":"ok"}`.

## 5. انشر الموقع على Cloudflare Pages
1. dash.cloudflare.com ← Workers & Pages ← Create ← **Pages** ← Connect to Git ← اختار الريبو.
2. الإعدادات:
   - **Root directory:** `stuttercare-ai`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variables:** `VITE_API_URL` = لينك الباك اند من خطوة 4 (من غير `/` في الآخر). ولو عايز: `VITE_WHATSAPP` و `VITE_PRICE_MONTHLY` و `VITE_CONTACT_EMAIL`.
3. Deploy. هيطلعلك لينك زي `https://stuttercare.pages.dev`. **ده لينك الموقع اللي تبعته للناس.**

## 6. اربط الاتنين
في Render ← الخدمة ← Environment ← غيّر `CLIENT_URL` للينك الموقع (`https://stuttercare.pages.dev`) ← Save (هيعيد النشر).

## 7. اعمل حساب المدير (من جهازك)
في `backend/.env` المحلي حط `ADMIN_EMAIL` و `ADMIN_PASSWORD` (12 حرف+)، وتأكد إن `MONGO_URI` هو نفس رابط Atlas، وبعدين:
```powershell
cd backend
npm run seed:admin
npm run migrate:verify-existing
```

## 8. جرّب
افتح لينك الموقع من الموبايل، اختار اللغة، سجّل بإيميل حقيقي، والكود لازم يوصل على الإيميل (بص في Spam).

## 9. مشكلة "أول فتح بطيء"
الباك اند المجاني على Render **بينام بعد 15 دقيقة من غير استخدام**، وأول طلب بعدها ممكن ياخد 30 إلى 60 ثانية. الحل المجاني: موقع زي **UptimeRobot** يزور `https://...onrender.com/api/health` كل 5 دقايق عشان يفضل صاحي. أو ترقّي الخدمة لباقة مدفوعة (تحل المشكلة وتسمح بـ SMTP). راجع حدود الباقة الحالية في موقع Render.

## 10. شورت كات (زي تطبيق)
- **الموبايل (كروم أندرويد):** افتح اللينك ← القايمة (⋮) ← **Add to Home screen**. هتظهر أيقونة.
- **الكمبيوتر (كروم):** أيقونة التثبيت في شريط العنوان، أو ⋮ ← Cast, save and share ← **Install** أو **Create shortcut**.
- **للمشاركة:** ابعت اللينك في واتساب، أو اعمل QR code للينك من أي موقع مجاني وحطه على كروت أو بوسترات.
- **اسم نطاق قصير** (مثلًا `stuttercare.com`): تشتريه وتربطه من Cloudflare Pages ← Custom domains.

## 11. التحديثات بعد كده
أي تعديل: `git push`، والموقعين بيتحدّثوا لوحدهم.
