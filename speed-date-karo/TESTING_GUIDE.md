# 🧪 Özellik Test Rehberi - Adım Adım

## Kurulum

1. **Dev Server Çalışıyor mu?**
   ```bash
   npm run dev
   # http://localhost:3000 erişilebilir olmalı
   ```

2. **Firebase Security Rules Güncellenmiş mi?**
   - Henüz yapmadıysan: `FIREBASE_SETUP.md`'yi takip et
   - **ÖNEMLİ**: Kurallar olmadan etkinlik oluşturamayacaksın!

---

## 🧑‍🤝‍🧑 Test Senaryosu: 2 Katılımcı (1 Tur)

### Adım 1: Hesaplar Oluştur

**Terminal 1 - Browser 1 (Moderatör)**
```
1. http://localhost:3000/register
2. İsim: "Ali" | Email: "ali@test.com" | Şifre: "test123"
3. Kaydol
4. (Otomatik moderatör role atanmazsa admin yapar)
```

**Terminal 2 - Browser 2 (Katılımcı 1)**
```
1. http://localhost:3000/register
2. İsim: "Ayşe" | Email: "ayse@test.com" | Şifre: "test123"
3. Kaydol
```

**Terminal 3 - Browser 3 (Katılımcı 2)**
```
1. http://localhost:3000/register
2. İsim: "Zeynep" | Email: "zeynep@test.com" | Şifre: "test123"
3. Kaydol
```

---

### Adım 2: Moderatör Etkinlik Oluştur

**Browser 1 (Ali - Moderatör)**

```
1. Giriş yap (ali@test.com)
2. /moderator → "Etkinlik Oluştur" butonuna tıkla
3. Form:
   - Başlık: "Hızlı Tanışma Akşamı"
   - Masa Sayısı: 1 (test için)
   - Süre: 1 dakika (test kolay olsun)
4. "Etkinlik Oluştur" tıkla
5. → Etkinlik lobi açılmalı
6. Katılımcı sayısı: 0 (henüz kimse katılmadı)
```

✅ **Beklenen Sonuç**: Etkinlik oluşturuldu, lobi açılmış.

---

### Adım 3: Katılımcılar Etkinliğe Katılır

**Browser 2 (Ayşe - Katılımcı 1)**
```
1. Giriş yap (ayse@test.com)
2. /participant → "Hızlı Tanışma Akşamı" görseyse "Katıl" tıkla
3. Olay lobi açılacak (status: "Bekleniyor")
4. Ekrana bakışma durumu devam etsin
```

**Browser 3 (Zeynep - Katılımcı 2)**
```
1. Giriş yap (zeynep@test.com)
2. /participant → "Hızlı Tanışma Akşamı" görseyse "Katıl" tıkla
3. Event lobi açılacak
```

✅ **Beklenen Sonuç**: Moderatör lobi'de 2 katılımcı görseyse başarılı.

---

### Adım 4: Moderatör Oturumu Başlat

**Browser 1 (Ali)**
```
1. "Oturumu Başlat" butonuna tıkla
2. Status değişecek: "Bekleniyor" → "Aktif"
3. Tur: 0 → 1
4. Katılımcıları göreceksin
5. Maç listesinde:
   - Masa 1: Ayşe ↔ Zeynep
   - Status: "Devam Ediyor"
```

✅ **Beklenen Sonuç**: Matches oluşturuldu, moderatör görebiliyor.

---

### Adım 5: Katılımcılar Match Görünümünü Görür

**Browser 2 (Ayşe)**
```
1. Sayfa otomatik güncellenmeli
2. Match görünümü açılmalı:
   ┌─────────────────┐
   │ Ayşe            │
   │ [✓ Hazırım!]    │ ← Sarı buton
   │      vs         │
   │ Zeynep          │
   │ ⏳ Bekleniyor    │
   │ Masa: 1         │
   │ ⏱️ 01:00        │
   └─────────────────┘
3. Timer başlar (01:00 → 00:59 → ...)
```

**Browser 3 (Zeynep)**
```
1. Aynı şekilde match view açılır
   ┌─────────────────┐
   │ Zeynep          │
   │ [✓ Hazırım!]    │ ← Sarı buton
   │      vs         │
   │ Ayşe            │
   │ ⏳ Bekleniyor    │
   │ Masa: 1         │
   │ ⏱️ 01:00        │
   └─────────────────┘
```

✅ **Beklenen Sonuç**: 
- ✓ Timer görülüyor
- ✓ "Hazırım!" butonu sarı
- ✓ Partner durumu görseyse

---

### Adım 6: Katılımcılar "Hazırım!" Dediler

**Browser 2 (Ayşe)**
```
1. "✓ Hazırım!" butonuna tıkla
2. Button dönüşür:
   "✓ Hazır olarak işaretlendiniz" (yeşil)
3. Zeynep'in durumu güncellenir:
   "⏳ Bekleniyor" → "✓ Hazır" (mavi)
```

**Browser 3 (Zeynep)**
```
1. "✓ Hazırım!" butonuna tıkla
2. Aynı dönüşüm oluşur
3. Ayşe'nin durumu: "✓ Hazır" görseyse
```

✅ **Beklenen Sonuç**:
- İkişi de hazır olarak işaretlendi
- Her iki taraf durumu görüyor
- Button yeşile döndü

---

### Adım 7: Timer Bittiğinde (1 dakika sonra)

**Tüm Browser'larda**
```
⏱️ Timer: 00:00 → "⏰ Zaman Bitti!"

Browser 1 (Moderatör):
┌─────────────────┐
│ Status: Aktif   │
│ Tur: 1          │
│ Maçlar:         │
│ Ayşe↔Zeynep     │
│ Status: Tamamlandı ✓
└─────────────────┘

Browser 2 & 3 (Katılımcı):
┌─────────────────┐
│ ✓ Maç Tamamlandı!
│ (Yeni tur veya etkinlik bittiğini bekle)
└─────────────────┘
```

✅ **Beklenen Sonuç**:
- Timer sıfırlandı
- Maç tamamlandı olarak işaretlendi
- Moderatörde status değişti

---

### Adım 8: Auto-Advance Kontrol Etme

**Browser 1 (Moderatör) - Console Çıkışı**
```
[Console] ✓ All 1 matches completed! Auto-advancing...
```

**Tüm Browser'larda**
```
Seçenek A (2 katılımcı varsa):
├─ Tüm çiftler tükendiği için
└─ Status: "Tamamlandı" 🎊
   "Etkinlik Tamamlandı! Herkesin ile tanıştınız."

Seçenek B (4+ katılımcı varsa):
├─ Tur: 1 → 2
├─ Yeni matches oluşturulur
└─ Yeni round başlar (Timer reset)
```

✅ **Beklenen Sonuç**: Auto-advance çalıştı!

---

## 🧑‍🤝‍🧑 Test Senaryosu 2: 4 Katılımcı (2 Tur)

Daha gerçekçi test için:

### Katılımcılar
- Ali (Moderatör)
- Ayşe
- Zeynep
- Merve
- Fatih (5. opsiyonel)

### Round 1 (Tur 1)
```
Maçlar:
- Masa 1: Ayşe ↔ Zeynep
- Masa 2: Merve ↔ Fatih (varsa)
- Masa 3: Merve (yalnız, yoksa pasta döner)
```

### Round 2 (Tur 2) - Auto-Advance
```
Yeni çiftler oluşturulur
Timer reset olur
Yeni masalar (1-2)
```

### Round 3 (Bitişi) veya Etkinlik Sonu
```
Tüm çiftler tükendiğinde kapanır
```

---

## 🐛 Hata Ayıklama

### Timer Görseyse
```javascript
// Browser Console (F12)
const timer = document.querySelector('[class*="font-mono"]');
console.log(timer.textContent); // "01:00" gibi
```

### Real-time Updates Çalışmıyorsa
```javascript
// Firestore listener kontrol
// Console'da "Unsubscribe" vs. hata alıyorsan
// → Browser refresh et (F5)
```

### Buton Tıklanmıyorsa
```javascript
// Button disabled mi kontrol et
document.querySelector('button').disabled
// false olmalı
```

### Auto-Advance Olmuyorsa
```javascript
// Console'a bak
// "✓ All X matches completed! Auto-advancing..." 
// log'u görseyse çalışıyor demektir
// Firestore Console'da matches'i kontrol et
```

---

## ✅ Kontrol Listesi

### Timer ✅
- [ ] Timer görülüyor (MM:SS formatında)
- [ ] Düşmeye başlıyor
- [ ] <60 saniye kaldığında kırmızı olur
- [ ] Sıfıra ulaştığında "Zaman Bitti!" mesajı görseyse

### Hazırım Butonu ✅
- [ ] Başlangıçta sarı ve aktif
- [ ] Tıkladığında loading görseyse
- [ ] Button yeşile döner + "Hazır olarak işaretlendiniz" mesajı
- [ ] Partner'ın durumu gerçek zamanlı güncellenir
- [ ] İkişi de hazır olunca her iki taraf da görseyse

### Auto-Advance ✅
- [ ] Tüm maçlar tamamlanınca 1 saniye beklenen
- [ ] Console'da "✓ All X matches completed!" logu görseyse
- [ ] Yeni tur başlamışsa (Round 2)
- [ ] Veya etkinlik bitmişse (Status: Completed)

### UI ✅
- [ ] Tüm yazılar okunur (beyaz arka plan koyu)
- [ ] Renkler gradyan ve tutarlı
- [ ] Responsive tasarım (mobil uyumlu)
- [ ] Hiçbir TypeScript hatası

---

## 📊 Beklenen Davranışlar

| Durum | Moderatör | Katılımcı |
|-------|-----------|----------|
| **Bekleniyor** | Katılımcıları görseyse | Lobi / İçeri girmesi beklenen |
| **Aktif - Hazır Değil** | Maç listesini görseyse | Match view, "Hazırım!" button |
| **Aktif - Hazır** | Status update görseyse | "Hazır olarak işaretlendiniz" |
| **Timer Bitince** | Maç completed görseyse | "Maç Tamamlandı!" mesajı |
| **Auto-Advance Tur 2** | Round 2 başlamışsa | Yeni match view, reset timer |
| **Bitmiş** | Status = Completed | "Etkinlik Tamamlandı!" |

---

## 🎬 Video Narasyonu (Opsiyonel)

```
"Görüldüğü gibi, moderatör oturumu başlattığında,
timer otomatik başlıyor ve katılımcılar masaya oturuyor.

Katılımcılar 'Hazırım' dedikten sonra,
sistem otomatik olarak maçı tamamlıyor.

Timer bitince,
tüm maçlar tamamlanmışsa etkinlik kapanıyor.
Ya da daha çift varsa, yeni tur otomatik başlıyor.

Moderatör hiçbir şey yapmazsa da sistem kendi kendine ilerliyorleceği.
Hepsi real-time Firestore ile senkronize."
```

---

## 📝 Not

- İlk test İçin 1 dakikalık timer kullan (test hızlı olsun)
- Production'da 3-5 dakika öner
- Firebase Rules güncellemezsen hiçbir şey çalışmaz!
- Development mode'den production'a geçerken Rules değiştirmeyi unutma

---

**Başarılı Testler!** 🚀
