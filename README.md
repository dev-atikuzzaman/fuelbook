# 📚 আমার অভিধান — Custom Dictionary + Info Vault PWA

একটা রিয়েল-টাইম, মাল্টি-ডিভাইস-সিঙ্ক PWA। Supabase কে ব্যাকএন্ড হিসেবে ব্যবহার করে, GitHub + Vercel এ **লাইফটাইম ফ্রি** হোস্ট করা যায়।

## ফিচার
- ৫টা ট্যাব: **সাধারণ**, **টেকনিক্যাল**, **সরকারি/দাপ্তরিক** ডিকশনারি + **ফাইল ম্যানেজার** + **কাস্টম টেমপ্লেট**
- প্রতিটা ডিকশনারি এন্ট্রিতে টেক্সট বা ছবি ইনপুট, তারপর ৬টা স্লাইডেবল সাব-ট্যাব: অর্থ, ব্যাখ্যা, সহজ এনালজি, প্রয়োগক্ষেত্র, উদাহরণ, বিবিধ
- প্রতিটা ডিকশনারিতে আলাদা কাস্টম সার্চ + ট্যাগ ফিল্টার
- ফাইল ম্যানেজার: যেকোনো ফরম্যাটের ফাইল বা পুরো ফোল্ডার আপলোড, ফোল্ডার নেভিগেশন, ফাইল/ফোল্ডার দুটোই ডাউনলোড/ডিলিট করা যায় (ফোল্ডার ডিলিট করলে ভেতরের সব ফাইলও মুছে যায়)
- কাস্টম টেমপ্লেট ট্যাব: নিজের টপিক বানাও (যেমন "পাসপোর্ট ফরম"), তারপর ছবি/টেক্সট + ইচ্ছামতো কাস্টম ফিল্ড (key-value) দিয়ে তথ্য সংরক্ষণ
- **এডমিন-অনলি লগইন** — Supabase Auth দিয়ে সুরক্ষিত; শুধু তোমার ইমেইল/পাসওয়ার্ড দিয়ে লগইন করলেই অ্যাপ খোলে, অন্য কেউ সাইন-আপ করে ঢুকতে পারবে না, ডাটাও শুধু লগইন করা অবস্থাতেই পড়া/লেখা যায়
- Supabase Realtime দিয়ে সব ডিভাইসে লাইভ সিঙ্ক
- PWA — মোবাইলে "Add to Home Screen" করে অ্যাপের মতো ব্যবহার করা যায়, অফলাইনেও শেল লোড হয়
- প্রিমিয়াম ডার্ক-গ্রিন + গোল্ড থিম

---

## ১) Supabase সেটআপ (প্রথমবার মাত্র)
1. [supabase.com](https://supabase.com) এ ফ্রি অ্যাকাউন্ট বানাও → **New Project**
2. প্রজেক্ট তৈরি হলে বাম পাশে **SQL Editor → New query**
3. এই রিপোর ভেতরের `supabase_schema.sql` ফাইলের পুরো কন্টেন্ট কপি-পেস্ট করে **Run** চাপো
   - এটা ৫টা টেবিল, Row-Level Security, দুইটা Storage bucket (`app-images`, `app-files`), এবং Realtime — সব একসাথে সেটআপ করে দেবে।
4. বাম পাশে **Settings → API** এ যাও, সেখান থেকে দুইটা জিনিস কপি করো:
   - **Project URL** → `REACT_APP_SUPABASE_URL`
   - **anon public key** → `REACT_APP_SUPABASE_ANON_KEY`

### এডমিন অ্যাকাউন্ট বানাও (শুধু তুমি লগইন করতে পারবে)
1. **Authentication → Users → "Add user"** এ যাও
2. নিজের ইমেইল ও একটা শক্তিশালী পাসওয়ার্ড দাও
3. **"Auto Confirm User"** টিক দিয়ে **Create user** চাপো
4. **Authentication → Sign In / Providers (Settings)** এ গিয়ে **"Allow new users to sign up"** অপশনটা **বন্ধ (OFF)** করে দাও — এতে তুমি ছাড়া আর কেউ অ্যাকাউন্ট বানাতে পারবে না

> নিরাপত্তা নোট: `anon` key ক্লায়েন্ট-সাইড কোডে খোলা থাকার জন্যই ডিজাইন করা (এটা publishable key, secret না)। ডাটাবেজ ও স্টোরেজের সব পড়া/লেখা এখন `authenticated` role এর জন্য RLS দিয়ে লক করা — মানে কেউ লগইন না করে কিছুই দেখতে বা বদলাতে পারবে না। অ্যাপে ঢুকতে হলে ধাপ ২ এ বানানো ইমেইল/পাসওয়ার্ড দিয়েই লগইন করতে হবে।

### আগে থেকেই deploy করা থাকলে (মাইগ্রেশন)
যদি আগে একবার `supabase_schema.sql` রান করে থাকো, পুরোটা আবার রান করার দরকার নেই — শুধু **`auth_migration.sql`** ফাইলটা SQL Editor এ Run করো, তারপর উপরের এডমিন অ্যাকাউন্ট বানানোর ধাপগুলো করো।

## ২) GitHub এ কোড আপলোড
1. GitHub এ একটা নতুন repository বানাও (public বা private, দুটোই ফ্রি কাজ করবে)
2. এই পুরো ফোল্ডারের কন্টেন্ট repo তে push করো (GitHub Desktop, git CLI, বা web upload — যেকোনো উপায়ে)

## ৩) Vercel এ Deploy
1. [vercel.com](https://vercel.com) এ GitHub দিয়ে সাইন-ইন করো (ফ্রি প্ল্যান)
2. **Add New → Project** → তোমার repo সিলেক্ট করো → Import
3. **Environment Variables** সেকশনে দুইটা variable যোগ করো:
   | Name | Value |
   |---|---|
   | `REACT_APP_SUPABASE_URL` | তোমার Supabase Project URL |
   | `REACT_APP_SUPABASE_ANON_KEY` | তোমার Supabase anon public key |
4. **Deploy** চাপো — Vercel অটোমেটিক্যালি `react-scripts build` চালিয়ে env var গুলো bundle এ inject করে দেবে
5. ২-৩ মিনিটে একটা লাইভ URL পাবে (যেমন `https://tor-app-name.vercel.app`) — এটাই তোমার PWA লিংক

> পরে env var পরিবর্তন করলে Vercel → Deployments → **Redeploy** চাপতে হবে (env var রিবিল্ড ছাড়া কার্যকর হয় না)।

## ৪) মোবাইলে অ্যাপের মতো ইনস্টল
- Chrome/Safari এ Vercel লিংক খুলো → মেনু থেকে **"Add to Home Screen"** / **"Install App"** সিলেক্ট করো
- এখন হোম স্ক্রিন থেকে সরাসরি খুলবে, ফুল-স্ক্রিন PWA হিসেবে

---

## লোকাল ডেভেলপমেন্ট (ঐচ্ছিক)
```bash
npm install
cp .env.example .env.local   # তারপর নিজের Supabase URL/key বসাও
npm start
```

## প্রজেক্ট স্ট্রাকচার
```
public/            index.html, manifest.json, sw.js (PWA শেল)
src/
  lib/
    supabase.js     Supabase ক্লায়েন্ট init
    storage.js      ছবি/ফাইল আপলোড হেল্পার
  components/
    Login.js          এডমিন লগইন স্ক্রিন (Supabase Auth)
    TopNav.js        ৫-ট্যাব নেভিগেশন + লগআউট বাটন
    DictionaryTab.js  ডিকশনারি লিস্ট + সার্চ/ফিল্টার (general/technical/government তিনটাতেই রিইউজ হয়)
    EntryEditor.js    ডিকশনারি এন্ট্রি এডিটর — ৬টা স্লাইডেবল সাব-ট্যাব
    EntryCard.js      লিস্ট কার্ড
    FilesTab.js       ফাইল/ফোল্ডার আপলোড ম্যানেজার
    CustomTab.js      টেমপ্লেট + ডাইনামিক কাস্টম ফিল্ড সিস্টেম
    Toast.js
  App.js
supabase_schema.sql  পুরো ডাটাবেজ + স্টোরেজ + এডমিন-অনলি RLS সেটআপ (নতুন প্রজেক্টে SQL Editor এ একবার Run করো)
auth_migration.sql   আগে থেকে deploy করা থাকলে শুধু এটা Run করলেই এডমিন-লগইন চালু হবে
```

## ভবিষ্যতে যোগ করা যেতে পারে
- ডিকশনারি এন্ট্রি এক্সপোর্ট (PDF/CSV)
- ভয়েস ইনপুট
- একাধিক এডমিন/রোল-ভিত্তিক অ্যাক্সেস
