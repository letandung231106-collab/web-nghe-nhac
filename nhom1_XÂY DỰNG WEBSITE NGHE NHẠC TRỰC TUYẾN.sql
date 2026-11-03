-- =====================================================================
-- CƠ SỞ DỮ LIỆU WEBSITE NGHE NHẠC TRỰC TUYẾN SOUNDVIBE (MUSICWAVE)
-- Đồ án cơ sở ngành - Nhóm 1 - Lớp VCNS.CQ.T107
-- Thành viên: Lữ Thành Đạt, Lê Tấn Dũng, Trần Chí Cường
-- GVHD: ThS. Bùi Sỹ Vương
--
-- Hệ quản trị: PostgreSQL 14 trở lên (triển khai trên Supabase)
-- Gồm 22 bảng; sinh từ tệp prisma/schema.prisma của hệ thống.
--
-- Cách chạy:
--   createdb musicwave
--   psql -d musicwave -f musicwave_database.sql
-- =====================================================================

BEGIN;

-- =====================================================================
-- PHẦN 1. TẠO BẢNG
-- =====================================================================

-- 1. users: Người dùng (người nghe và quản trị viên)
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "googleSubject" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "proExpiresAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- 2. artists: Ca sĩ / nghệ sĩ
CREATE TABLE "artists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL,
    "bannerUrl" TEXT,
    "biography" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT,
    "monthlyListeners" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

-- 3. albums: Album
CREATE TABLE "albums" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "artistId" TEXT NOT NULL,
    "genreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- 4. genres: Thể loại âm nhạc
CREATE TABLE "genres" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coverUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT '#8b5cf6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- 5. songs: Bài hát
CREATE TABLE "songs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "albumId" TEXT,
    "genreId" TEXT,
    "duration" INTEGER NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "coverUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'url',
    "youtubeUrl" TEXT,
    "youtubeId" TEXT,
    "playsCount" INTEGER NOT NULL DEFAULT 0,
    "releaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

-- 6. lyrics: Lời bài hát (thường và đồng bộ LRC)
CREATE TABLE "lyrics" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "plainLyrics" TEXT NOT NULL,
    "syncedLyrics" TEXT,
    "isSynced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lyrics_pkey" PRIMARY KEY ("id")
);

-- 7. playlists: Danh sách phát
CREATE TABLE "playlists" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- 8. playlist_songs: Chi tiết danh sách phát
CREATE TABLE "playlist_songs" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlist_songs_pkey" PRIMARY KEY ("id")
);

-- 9. favorites: Bài hát yêu thích
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- 10. recently_played: Lịch sử nghe nhạc
CREATE TABLE "recently_played" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationPlayed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recently_played_pkey" PRIMARY KEY ("id")
);

-- 11. followers: Theo dõi ca sĩ
CREATE TABLE "followers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followers_pkey" PRIMARY KEY ("id")
);

-- 12. notifications: Thông báo
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- 13. password_reset_otps: Mã OTP khôi phục mật khẩu
CREATE TABLE "password_reset_otps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_otps_pkey" PRIMARY KEY ("id")
);

-- 14. import_batches: Đợt nhập nhạc hàng loạt
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "totalFiles" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- 15. import_item_logs: Nhật ký từng tệp nhập
CREATE TABLE "import_item_logs" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "songTitle" TEXT,
    "artistName" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "songId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_item_logs_pkey" PRIMARY KEY ("id")
);

-- 16. payment_orders: Đơn thanh toán Music Pro
CREATE TABLE "payment_orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 50000,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

-- 17. daily_usage: Lượt nghe trong ngày của tài khoản miễn phí
CREATE TABLE "daily_usage" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_usage_pkey" PRIMARY KEY ("userId","day")
);

-- 18. playback_sessions: Phiên phát nhạc
CREATE TABLE "playback_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "adRequired" BOOLEAN NOT NULL DEFAULT false,
    "readyAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "playback_sessions_pkey" PRIMARY KEY ("id")
);

-- 19. song_ratings: Đánh giá bài hát
CREATE TABLE "song_ratings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "song_ratings_pkey" PRIMARY KEY ("id")
);

-- 20. jam_rooms: Phòng nghe chung
CREATE TABLE "jam_rooms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "songId" TEXT,
    "positionSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPlaying" BOOLEAN NOT NULL DEFAULT false,
    "stateAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pendingSongIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quizRound" INTEGER NOT NULL DEFAULT 0,
    "quizSongId" TEXT,
    "quizOptionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quizEndsAt" TIMESTAMP(3),
    "quizRevealed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "jam_rooms_pkey" PRIMARY KEY ("id")
);

-- 21. jam_members: Thành viên phòng nghe chung
CREATE TABLE "jam_members" (
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quizScore" INTEGER NOT NULL DEFAULT 0,
    "quizAnsweredRound" INTEGER NOT NULL DEFAULT 0,
    "quizLastChoice" TEXT,
    "quizLastPoints" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "jam_members_pkey" PRIMARY KEY ("roomId","userId")
);

-- 22. jam_messages: Tin nhắn phòng nghe chung
CREATE TABLE "jam_messages" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'chat',
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jam_messages_pkey" PRIMARY KEY ("id")
);


-- =====================================================================
-- PHẦN 2. CHỈ MỤC VÀ RÀNG BUỘC DUY NHẤT
-- =====================================================================

-- Chỉ mục
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- Chỉ mục
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Chỉ mục
CREATE UNIQUE INDEX "users_googleSubject_key" ON "users"("googleSubject");

-- Chỉ mục
CREATE INDEX "users_role_idx" ON "users"("role");

-- Chỉ mục
CREATE INDEX "users_isBlocked_idx" ON "users"("isBlocked");

-- Chỉ mục
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- Chỉ mục
CREATE UNIQUE INDEX "artists_name_key" ON "artists"("name");

-- Chỉ mục
CREATE INDEX "artists_monthlyListeners_idx" ON "artists"("monthlyListeners" DESC);

-- Chỉ mục
CREATE INDEX "artists_createdBy_idx" ON "artists"("createdBy");

-- Chỉ mục
CREATE INDEX "albums_artistId_idx" ON "albums"("artistId");

-- Chỉ mục
CREATE INDEX "albums_genreId_idx" ON "albums"("genreId");

-- Chỉ mục
CREATE INDEX "albums_releaseDate_idx" ON "albums"("releaseDate" DESC);

-- Chỉ mục
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- Chỉ mục
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- Chỉ mục
CREATE INDEX "songs_artistId_idx" ON "songs"("artistId");

-- Chỉ mục
CREATE INDEX "songs_albumId_idx" ON "songs"("albumId");

-- Chỉ mục
CREATE INDEX "songs_genreId_idx" ON "songs"("genreId");

-- Chỉ mục
CREATE INDEX "songs_isTrending_playsCount_idx" ON "songs"("isTrending", "playsCount" DESC);

-- Chỉ mục
CREATE INDEX "songs_isFeatured_createdAt_idx" ON "songs"("isFeatured", "createdAt" DESC);

-- Chỉ mục
CREATE INDEX "songs_playsCount_idx" ON "songs"("playsCount" DESC);

-- Chỉ mục
CREATE INDEX "songs_createdAt_idx" ON "songs"("createdAt" DESC);

-- Chỉ mục
CREATE UNIQUE INDEX "lyrics_songId_key" ON "lyrics"("songId");

-- Chỉ mục
CREATE INDEX "playlists_userId_idx" ON "playlists"("userId");

-- Chỉ mục
CREATE INDEX "playlists_isPublic_idx" ON "playlists"("isPublic");

-- Chỉ mục
CREATE INDEX "playlists_updatedAt_idx" ON "playlists"("updatedAt" DESC);

-- Chỉ mục
CREATE INDEX "playlist_songs_songId_idx" ON "playlist_songs"("songId");

-- Chỉ mục
CREATE INDEX "playlist_songs_playlistId_position_idx" ON "playlist_songs"("playlistId", "position" ASC);

-- Chỉ mục
CREATE UNIQUE INDEX "playlist_songs_playlistId_songId_key" ON "playlist_songs"("playlistId", "songId");

-- Chỉ mục
CREATE INDEX "favorites_songId_idx" ON "favorites"("songId");

-- Chỉ mục
CREATE INDEX "favorites_userId_createdAt_idx" ON "favorites"("userId", "createdAt" DESC);

-- Chỉ mục
CREATE UNIQUE INDEX "favorites_userId_songId_key" ON "favorites"("userId", "songId");

-- Chỉ mục
CREATE INDEX "recently_played_userId_playedAt_idx" ON "recently_played"("userId", "playedAt" DESC);

-- Chỉ mục
CREATE INDEX "recently_played_songId_idx" ON "recently_played"("songId");

-- Chỉ mục
CREATE INDEX "followers_artistId_idx" ON "followers"("artistId");

-- Chỉ mục
CREATE INDEX "followers_userId_idx" ON "followers"("userId");

-- Chỉ mục
CREATE UNIQUE INDEX "followers_userId_artistId_key" ON "followers"("userId", "artistId");

-- Chỉ mục
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt" DESC);

-- Chỉ mục
CREATE INDEX "password_reset_otps_userId_idx" ON "password_reset_otps"("userId");

-- Chỉ mục
CREATE INDEX "password_reset_otps_userId_expiresAt_idx" ON "password_reset_otps"("userId", "expiresAt");

-- Chỉ mục
CREATE INDEX "import_batches_createdAt_idx" ON "import_batches"("createdAt" DESC);

-- Chỉ mục
CREATE INDEX "import_item_logs_batchId_idx" ON "import_item_logs"("batchId");

-- Chỉ mục
CREATE INDEX "import_item_logs_createdAt_idx" ON "import_item_logs"("createdAt" DESC);

-- Chỉ mục
CREATE UNIQUE INDEX "payment_orders_code_key" ON "payment_orders"("code");

-- Chỉ mục
CREATE UNIQUE INDEX "payment_orders_transactionId_key" ON "payment_orders"("transactionId");

-- Chỉ mục
CREATE INDEX "payment_orders_userId_createdAt_idx" ON "payment_orders"("userId", "createdAt");

-- Chỉ mục
CREATE INDEX "playback_sessions_userId_expiresAt_idx" ON "playback_sessions"("userId", "expiresAt");

-- Chỉ mục
CREATE INDEX "song_ratings_songId_updatedAt_idx" ON "song_ratings"("songId", "updatedAt" DESC);

-- Chỉ mục
CREATE UNIQUE INDEX "song_ratings_userId_songId_key" ON "song_ratings"("userId", "songId");

-- Chỉ mục
CREATE UNIQUE INDEX "jam_rooms_code_key" ON "jam_rooms"("code");

-- Chỉ mục
CREATE INDEX "jam_rooms_hostId_endedAt_idx" ON "jam_rooms"("hostId", "endedAt");

-- Chỉ mục
CREATE INDEX "jam_messages_roomId_createdAt_idx" ON "jam_messages"("roomId", "createdAt");


-- =====================================================================
-- PHẦN 3. KHÓA NGOẠI
-- =====================================================================

-- Khóa ngoại
ALTER TABLE "artists" ADD CONSTRAINT "artists_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "albums" ADD CONSTRAINT "albums_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "albums" ADD CONSTRAINT "albums_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "songs" ADD CONSTRAINT "songs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "songs" ADD CONSTRAINT "songs_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "songs" ADD CONSTRAINT "songs_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "songs" ADD CONSTRAINT "songs_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "lyrics" ADD CONSTRAINT "lyrics_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "playlist_songs" ADD CONSTRAINT "playlist_songs_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "playlist_songs" ADD CONSTRAINT "playlist_songs_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "recently_played" ADD CONSTRAINT "recently_played_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "recently_played" ADD CONSTRAINT "recently_played_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "followers" ADD CONSTRAINT "followers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "followers" ADD CONSTRAINT "followers_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "password_reset_otps" ADD CONSTRAINT "password_reset_otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "import_item_logs" ADD CONSTRAINT "import_item_logs_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "daily_usage" ADD CONSTRAINT "daily_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "playback_sessions" ADD CONSTRAINT "playback_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "song_ratings" ADD CONSTRAINT "song_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "song_ratings" ADD CONSTRAINT "song_ratings_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "jam_rooms" ADD CONSTRAINT "jam_rooms_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "jam_members" ADD CONSTRAINT "jam_members_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "jam_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "jam_members" ADD CONSTRAINT "jam_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "jam_messages" ADD CONSTRAINT "jam_messages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "jam_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Khóa ngoại
ALTER TABLE "jam_messages" ADD CONSTRAINT "jam_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- PHẦN 4. MÔ TẢ BẢNG
-- =====================================================================

COMMENT ON TABLE "users" IS 'Người dùng (người nghe và quản trị viên)';
COMMENT ON TABLE "artists" IS 'Ca sĩ / nghệ sĩ';
COMMENT ON TABLE "albums" IS 'Album';
COMMENT ON TABLE "genres" IS 'Thể loại âm nhạc';
COMMENT ON TABLE "songs" IS 'Bài hát';
COMMENT ON TABLE "lyrics" IS 'Lời bài hát (thường và đồng bộ LRC)';
COMMENT ON TABLE "playlists" IS 'Danh sách phát';
COMMENT ON TABLE "playlist_songs" IS 'Chi tiết danh sách phát';
COMMENT ON TABLE "favorites" IS 'Bài hát yêu thích';
COMMENT ON TABLE "recently_played" IS 'Lịch sử nghe nhạc';
COMMENT ON TABLE "followers" IS 'Theo dõi ca sĩ';
COMMENT ON TABLE "notifications" IS 'Thông báo';
COMMENT ON TABLE "password_reset_otps" IS 'Mã OTP khôi phục mật khẩu';
COMMENT ON TABLE "import_batches" IS 'Đợt nhập nhạc hàng loạt';
COMMENT ON TABLE "import_item_logs" IS 'Nhật ký từng tệp nhập';
COMMENT ON TABLE "payment_orders" IS 'Đơn thanh toán Music Pro';
COMMENT ON TABLE "daily_usage" IS 'Lượt nghe trong ngày của tài khoản miễn phí';
COMMENT ON TABLE "playback_sessions" IS 'Phiên phát nhạc';
COMMENT ON TABLE "song_ratings" IS 'Đánh giá bài hát';
COMMENT ON TABLE "jam_rooms" IS 'Phòng nghe chung';
COMMENT ON TABLE "jam_members" IS 'Thành viên phòng nghe chung';
COMMENT ON TABLE "jam_messages" IS 'Tin nhắn phòng nghe chung';

COMMIT;

-- =====================================================================
-- PHẦN 5. MỘT SỐ TRUY VẤN MẪU (tham khảo, không bắt buộc chạy)
-- =====================================================================

-- Top 10 bài hát thịnh hành theo lượt phát
-- SELECT s."id", s."title", a."name" AS "artist", s."playsCount"
-- FROM "songs" s JOIN "artists" a ON a."id" = s."artistId"
-- WHERE s."isTrending" = true
-- ORDER BY s."playsCount" DESC
-- LIMIT 10;

-- Danh sách bài hát trong một playlist theo đúng thứ tự
-- SELECT ps."position", s."title", s."duration"
-- FROM "playlist_songs" ps JOIN "songs" s ON s."id" = ps."songId"
-- WHERE ps."playlistId" = '<mã playlist>'
-- ORDER BY ps."position" ASC;

-- Tổng lượt nghe theo thể loại
-- SELECT g."name", COUNT(s."id") AS "songs", SUM(s."playsCount") AS "plays"
-- FROM "genres" g LEFT JOIN "songs" s ON s."genreId" = g."id"
-- GROUP BY g."id", g."name"
-- ORDER BY "plays" DESC NULLS LAST;

-- Doanh thu Music Pro đã thanh toán
-- SELECT COUNT(*) AS "orders", SUM("amount") AS "revenue"
-- FROM "payment_orders" WHERE "status" = 'PAID';
