# Requirements Document

## Introduction

Bu özellik, Electron uygulamasında MySQL ve PostgreSQL veritabanlarına güvenli bağlantı yönetimi sağlayacak. Kullanıcılar bağlantı bilgilerini kaydedebilecek, yönetebilecek ve veritabanı işlemlerini IPC üzerinden güvenli şekilde gerçekleştirebilecek. Bağlantı bilgileri şifrelenmiş olarak yerel dosya sisteminde saklanacak.

## Requirements

### Requirement 1

**User Story:** Bir kullanıcı olarak, MySQL ve PostgreSQL veritabanı bağlantı bilgilerimi güvenli şekilde kaydetmek istiyorum, böylece bu bilgileri tekrar tekrar girmek zorunda kalmayayım.

#### Acceptance Criteria

1. WHEN kullanıcı yeni bir veritabanı bağlantısı oluşturmak istediğinde THEN sistem MySQL ve PostgreSQL seçeneklerini sunacak
2. WHEN kullanıcı bağlantı bilgilerini girdiğinde THEN sistem host, port, database name, username, password alanlarını kabul edecek
3. WHEN bağlantı bilgileri kaydedildiğinde THEN sistem bu bilgileri şifrelenmiş olarak app data klasöründe saklayacak
4. WHEN şifre girildiğinde THEN sistem şifreyi maskeleyerek gösterecek
5. IF bağlantı bilgileri eksik veya hatalıysa THEN sistem uygun hata mesajları gösterecek

### Requirement 2

**User Story:** Bir kullanıcı olarak, kaydettiğim veritabanı bağlantılarını görüntülemek ve yönetmek istiyorum, böylece hangi bağlantılarım olduğunu bilebilirim.

#### Acceptance Criteria

1. WHEN kullanıcı bağlantılar sayfasını açtığında THEN sistem tüm kayıtlı bağlantıları listeleyecek
2. WHEN bağlantı listesi gösterildiğinde THEN her bağlantı için name, host, database, type bilgileri görünecek
3. WHEN kullanıcı bir bağlantıyı düzenlemek istediğinde THEN sistem mevcut bilgileri form alanlarına dolduracak
4. WHEN kullanıcı bir bağlantıyı silmek istediğinde THEN sistem onay isteyecek
5. IF aktif bağlantı varsa THEN sistem bağlantıyı silmeden önce kapatacak

### Requirement 3

**User Story:** Bir kullanıcı olarak, kaydettiğim veritabanı bağlantılarına bağlanmak istiyorum, böylece veritabanı işlemlerimi gerçekleştirebilirim.

#### Acceptance Criteria

1. WHEN kullanıcı bir bağlantıya bağlanmak istediğinde THEN sistem IPC üzerinden main process'te bağlantı kuracak
2. WHEN bağlantı başarılı olduğunda THEN sistem bağlantı durumunu "connected" olarak işaretleyecek
3. WHEN bağlantı başarısız olduğunda THEN sistem detaylı hata mesajı gösterecek
4. WHEN kullanıcı bağlantıyı kapatmak istediğinde THEN sistem bağlantıyı güvenli şekilde kapatacak
5. IF bağlantı zaman aşımına uğrarsa THEN sistem otomatik olarak bağlantıyı kapatacak

### Requirement 4

**User Story:** Bir kullanıcı olarak, bağlı olduğum veritabanında SQL sorguları çalıştırmak istiyorum, böylece veri işlemlerimi gerçekleştirebilirim.

#### Acceptance Criteria

1. WHEN kullanıcı SQL sorgusu yazdığında THEN sistem sorguyu main process'te güvenli şekilde çalıştıracak
2. WHEN sorgu başarılı olduğunda THEN sistem sonuçları tablo formatında gösterecek
3. WHEN sorgu hata verdiğinde THEN sistem detaylı hata mesajını gösterecek
4. WHEN uzun süren sorgu çalıştığında THEN kullanıcı sorguyu iptal edebilecek
5. IF sorgu çok büyük sonuç döndürürse THEN sistem sayfalama uygulayacak

### Requirement 5

**User Story:** Bir kullanıcı olarak, bağlı olduğum veritabanının şemasını görüntülemek istiyorum, böylece tablo ve kolon yapılarını bilebilirim.

#### Acceptance Criteria

1. WHEN kullanıcı şema görüntüleme isteğinde bulunduğunda THEN sistem veritabanındaki tüm tabloları listeleyecek
2. WHEN bir tablo seçildiğinde THEN sistem tablonun kolon bilgilerini gösterecek
3. WHEN kolon bilgileri gösterildiğinde THEN sistem data type, null constraint, default value bilgilerini içerecek
4. WHEN şema yüklenirken THEN sistem loading durumunu gösterecek
5. IF şema yüklenemezse THEN sistem hata mesajı gösterecek

### Requirement 6

**User Story:** Bir sistem yöneticisi olarak, bağlantı bilgilerinin güvenli şekilde saklandığından emin olmak istiyorum, böylece hassas veriler korunmuş olsun.

#### Acceptance Criteria

1. WHEN bağlantı bilgileri kaydedildiğinde THEN sistem şifreleri encrypt edecek
2. WHEN uygulama başlatıldığında THEN sistem bağlantı bilgilerini decrypt edecek
3. WHEN dosya sistemi erişimi olduğunda THEN bağlantı dosyaları sadece uygulama tarafından okunabilir olacak
4. WHEN uygulama kapatıldığında THEN sistem tüm aktif bağlantıları güvenli şekilde kapatacak
5. IF şifreleme anahtarı bulunamazsa THEN sistem yeni anahtar oluşturacak