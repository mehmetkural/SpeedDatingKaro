# Sonraki Adımlar - Firebase Security Rules Konfigürasyonu

## 🔴 KRITIK: Firebase Güvenlik Kuralları Düzeltilmesi Gerekiyor

Etkinlik oluşturmak, katılımcı eklemek ve maçlar oluşturmak için Firebase Security Rules güncellenmesi **ZORUNLU**'dur.

### Adım 1: Firebase Console'a Gidin
1. https://console.firebase.google.com adresine gidin
2. "speed-date-karo" projesini seçin

### Adım 2: Firestore Database → Rules Sekmesine Gidin
1. Sol menüde "Firestore Database" seçin
2. "Rules" sekmesine tıklayın

### Adım 3: Güvenlik Kurallarını Güncelleyin
Mevcut kuralları aşağıdaki kodla değiştirin (GELIŞTIRME için):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Kimlik doğrulanmış kullanıcılar
    match /users/{uid} {
      allow create: if request.auth.uid == uid;
      allow read, update: if request.auth.uid == uid;
      allow list, read: if request.auth.uid != null;
    }

    match /events/{eventId} {
      allow create: if request.auth.uid != null;
      allow read, update, delete: if request.auth.uid != null;
      
      // Katılımcılar altkoleksiyonu
      match /participants/{participantId} {
        allow create, read, update: if request.auth.uid != null;
        allow delete: if request.auth.uid == resource.data.uid;
      }
      
      // Maçlar altkoleksiyonu
      match /matches/{matchId} {
        allow create, read, update: if request.auth.uid != null;
        allow delete: if request.auth.uid != null;
      }
    }
  }
}
```

### Adım 4: Yayınla (Publish)
1. Sağ üst köşede "Publish" düğmesine tıklayın
2. Onay iletişimine "Publish" ile yanıt verin
3. Kural güncellemesi 1-2 dakika içinde etkinleşir

## ✅ Kural Yayınlandıktan Sonra Test Edin

### Test Akışı:
1. http://localhost:3000 adresine gidin
2. Yeni bir hesap oluşturun (Kaydol)
3. Moderatör rolüne geçmek için Admin Paneli kullanın (admin hesabı gerekir)
   - Alternatif: Firestore Console'da kullanıcı role'ünü manuel değiştirin
4. Moderatör olarak giriş yapın
5. "Etkinlik Oluştur" butonu tıklayın
6. Etkinlik detaylarını doldurun ve "Etkinlik Oluştur" tıklayın
7. **Başarısı göstergesi**: Etkinlik oluşturulduysa ve etkinlik lobi açıldıysa ✅

## 🚨 Hata Alırsan:

### "Missing or insufficient permissions" Hatası
- Security Rules güncellenememiş demektir
- Adım 1-4'ü tekrar kontrol edin
- Firefox Developer Tools → Konsol'da hata detayını görebilirsin

### Etkinlik oluştu ama görüntülenmiyor
- Sayfayı yenile (F5)
- Firestore Console'da events koleksiyonunu kontrol et
- Matches oluşturulmuş mu kontrol et

## 📋 Sonraki Özellikler (UI Tamamlandıktan Sonra)

1. **Geri Sayım Zamanlayıcısı** (Timer Component)
   - Oturum başladıktan sonra geri sayım göster
   - Kırmızı renkte < 60 saniye kaldığında

2. **"Hazırım" Butonu**
   - Katılımcılar masaya oturduktan sonra tıklar
   - Match durumunu günceller
   - Her iki taraf "Hazır" olduysa saniye saydırır

3. **Otomatik Tur Geçişi**
   - Tüm maçlar tamamlandıktan sonra
   - Eğer daha çift varsa yeni tur oluştur
   - Değilse etkinliği bitir

4. **Moderatör Dashboard'u**
   - Canlı maç sayacı (X/Y maçlar tamamlandı)
   - Katılımcı hazırlık durumu

## 📞 Sorun Gidermek için:

**Eğer etkinlik yine oluşmuyorsa:**
1. Developer Tools açın (F12)
2. Console sekmesine gidin
3. Hata mesajını tam olarak not edin
4. Firestore Security Rules'u tekrar kontrol edin

**Security Rules'daki hataları kontrol etmek için:**
- Firebase Console → Rules → "Rules Playground" seç
- Test verilerini gir ve kontrol et

---

**Yapılmış İş**: ✅ Tüm arayüz iyileştirmeleri tamamlandı, yazılar artık okunur.
**Bloke Eden**: 🔒 Firebase Security Rules - yukarıdaki adımları tamamla!
