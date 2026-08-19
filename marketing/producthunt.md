# Product Hunt Launch Pack — Bank2Excel

## Ayarlar

- **Name:** Bank2Excel
- **Tagline:** PDF bank statements to Excel/CSV in 20 seconds
- **Website:** (Render URL'iniz — deploy sonrası)
- **Topics:** Web App, Accounting, Productivity, Fintech, SaaS
- **Galeri (3-5 görsel):** 1) Hero ekran görüntüsü 2) Demo GIF (upload → summary → download) 3) CSV çıktısı örneği 4) Ücretsiz/lisans ekranı 5) "How it works" 3 adım

## Demo GIF senaryosu (15-20 saniye)

1. 0-3sn: PDF dosyayı kutuya sürükle
2. 3-10sn: "Parsing..." → summary panel belirir (8 transactions, credits/debits/net)
3. 10-16sn: "Download Excel" tıklanır, Excel açılır, satırlar temiz görünür
4. 16-20sn: paywall ekranı (1 ücretsiz / $9 ömür boyu)

Kayıt: Windows `Win+Alt+R` (Xbox Game Bar) veya OBS. Boyut: GIF <10MB (compress: ezgif.com)

## Açıklama (Description)

```
Bank2Excel converts PDF bank statements into clean Excel and CSV files in ~20 seconds.
No account. No signup. Your file is processed in memory and deleted within 15 minutes.

Why I built it: every month I re-typed dozens of pages of bank statements into
spreadsheets. Every existing tool wanted my email, my account, and $50/month — and made
me upload my entire financial history to their cloud.

How it works:
1. Drop your bank statement PDF
2. We extract every transaction: date, description, amount, running balance
3. Download CSV (Excel-ready) or XLSX

What it handles:
• US (1,234.56) and EU (1.234,56) number formats
• Parentheses negatives, DR/CR markers, multi-line descriptions
• Multi-page statements up to 250 pages / 10 MB
• Automatic summary: total credits, debits, net, date range, currency

Pricing: 1 free conversion per day. $9 lifetime license (one-time, no subscription).

Built for accountants, bookkeepers, freelancers and small business owners who are
tired of data entry.
```

## Maker Comment (lansman günü ilk yorum — kritik)

```
Hi PH! I'm the solo founder behind Bank2Excel. Honest story:

I run a small e-comm operation and every month I'd spend an hour+ manually copying
bank statement PDFs into spreadsheets for my bookkeeper. I looked for a tool and found
either enterprise platforms (huge setup, huge price) or services that wanted to store
my bank data. So I built this instead.

Design decisions:
• No accounts. A file upload box and a download button. That's the whole product.
• Privacy by architecture: statements are processed in memory, files deleted in 15 min.
• $9 lifetime. I'd rather sell 100 happy licenses than 1 unhappy $50/month sub.
• Security: PDFs validated by content, rate limited, tokens signed — I ran a full
  OWASP-style pass before launch. Details in the repo (it's open source).

Honest limitations:
• Text-based PDFs only for now (scanned statements need OCR — planned)
• Day-first dates assumed; some US layouts need a manual check

What would make this worth $19 or even $29 for you? I'm building this in public and
I'll ship what you tell me to.

Free to try today — 1 conversion per day, no email required.
```

## Lansman günü checklist

- [ ] Gönderiyi TSİ sabah 06:00-07:00'de yayınla (ABD sabahına denk gelir)
- [ ] Maker comment'i ilk 5 dakikada at
- [ ] 10-20 kişiye launch linkini DM'le (upvote iste)
- [ ] İlk 2 saat her yoruma cevap ver (en az 10 kelime)
- [ ] X'te @ProductHunt etiketiyle "live on Product Hunt" postu at
- [ ] 48 saat boyunca güncel kal, yorumlara cevap ver
- [ ] Sonucu kaydet: upvote sayısı, yorumlar, gelen site trafiği, satış

## Beklenti

İlk lansmandan 0-20 satış normal (Starter Story'deki Packager bile lansmanda $0 yaptı).
PH'nin asıl değeri: ilk kullanıcılar, geri bildirim ve "launched on PH" güven rozeti.