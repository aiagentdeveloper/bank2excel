# Reddit Launch Pack — Bank2Excel

Kurallar: her sub'a **1 gönderi**, 1-2 haftada bir. Reklam gibi durmasın: değer ver, hikaye anlat, araçtan sonra söz et. Self-promo şüphesi → yorumlar silinir; hep "kendi sorunumu çözdüm" çerçevesi kullan.

## GÖNDERİ 1 — r/Accounting (en yüksek niyet)

**Title:**
> I got tired of typing bank statement numbers into Excel, so I built a tool that does it in 20 seconds

**Body:**
```
I'm not an accountant, but I help run a small e-comm operation and every month I found myself
re-typing 30-40 pages of bank statements into spreadsheets. All the big tools were either
enterprise-priced or required creating an account and trusting them with my statements.

So I built Bank2Excel: you upload a PDF statement, it extracts every transaction (date,
description, amount, running balance), and gives you a clean CSV or Excel file in ~20 seconds.

Details:
- No account, no signup — file is processed in memory and deleted within 15 minutes
- Handles US (1,234.56) and EU (1.234,56) formats, parentheses negatives, DR/CR markers
- 1 free conversion per day, $9 lifetime license after that

Honest limitations: text-based statements only (no OCR yet — that's next), and it assumes
day-first dates, so some US layouts need a manual check.

Question for the room: bookkeepers/accountants — how do YOU handle client bank statement PDFs
today? Am I solving a real problem or did I build something you already have better tools for?
```

## GÖNDERİ 2 — r/Bookkeeping

**Title:**
> Bank statement PDFs → clean Excel in 20 seconds. I built this because I hated data entry

**Body:**
```
Every month, same ritual: download 40-page PDF, open Excel, type everything in, triple-check
the totals match. I automated it and now I want to know if this is actually useful for other
bookkeepers.

Bank2Excel — upload PDF statement, get back:
- Every transaction with date, description, amount, balance
- Auto-detected credits/debits and a summary (totals, date range, currency)
- CSV + real Excel export

No signup, no storing your data (deleted in 15 min), 1 free conversion/day then a $9 lifetime
license.

What statement layouts does it NOT handle well? Scanned/image PDFs (OCR is planned). That's my
honest answer if you ask.

Bookkeepers — what's the #1 thing that would make this worth paying for? Be brutal, I need
real feedback.
```

## GÖNDERİ 3 — r/smallbusiness

**Title:**
> PSA: your bank's PDF statement can become a spreadsheet in 20 seconds (free tool I built)

**Body:**
```
Spent yesterday manually rebuilding a bank statement in Google Sheets for my bookkeeper.
Checked if there was a quick tool — everything wanted my email, my account, my firstborn,
or $50/month.

So I made Bank2Excel:
1. Drop the PDF from your bank
2. It reads every transaction automatically
3. Download CSV or Excel

No account. File gone in 15 minutes. 1 free conversion/day, then a $9 one-time lifetime license.

My bank's export was ~40 pages — took 18 seconds. It's the most boring tool I've ever built
and I'm weirdly proud of it. Small business owners: do you deal with this too, or is it just me?
```

## GÖNDERİ 4 — r/personalfinance (dikkatli, değer odaklı)

**Title:**
> TIL: you can convert your bank statement PDF into Excel/CSV in 20 seconds (useful for budgeting)

**Body:**
```
For everyone doing year-end budgeting: banks usually give you a PDF statement and "you can
import it" — except most banks don't actually give you a clean export.

I built a tiny free tool (Bank2Excel) that turns a statement PDF into CSV/Excel in ~20 seconds.
- No account, no uploads stored (deleted in 15 min)
- 1 free conversion per day, $9 lifetime if you need more

Not a sponsorship — it's literally a landing page and a file upload box. If you prefer
spreadsheet-free budgeting this isn't for you, but for the spreadsheet crowd it saves an hour
a month. Genuine question: do your banks give clean CSV exports? Mine never do.
```

## CEVAP ŞABLONLARI (arama yapıp cevaplayın)

Her gün şu aramalar: `"bank statement to excel"`, `"convert bank statement"`, `"statement pdf to csv"`, `"how to import bank statement into excel"`

**Cevap şablonu:**
```
Not a direct answer to your exact bank, but I built a free tool for this: Bank2Excel —
upload the statement PDF, it extracts every transaction with dates/amounts/balances and
gives you CSV or Excel. No account, file deleted after 15 min, 1 free conversion/day.
I couldn't find a tool that didn't want my email + bank details, so I made this one.
```

## KURALLAR (banlanmamak için)

1. Hesap yeni (karma düşük) → önce 1 hafta normal yorum yapın, sonra gönderi atın
2. Asla aynı metni birden fazla sub'a kopyalamayın — her sub için farklı açı yukarıdaki gibi
3. Link yorumlarda → bazı sub'larda yasak; gönderi içinde link yerine "Bank2Excel" adını geçirin, ilgilenen sorunca link atın
4. "I built this" gönderileri r/Accounting'de kabul görür, r/personalfinance'da agresif self-promo sayılabilir — orada değer odaklı başlık kullanın
5. İlk 24 saat içinde yorumlara cevap verin (Reddit algoritması için kritik)