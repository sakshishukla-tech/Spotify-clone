import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const BASE = 'E:/spotify__clone/assets/images';

const unsplash = (id, w, h) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;

const artists = {
  'arijit-singh.jpg': unsplash('photo-1516280440614-37939bbacd81', 400, 400),
  'shreya-ghoshal.jpg': unsplash('photo-1511379938544-c1f69419868d', 400, 400),
  'atif-aslam.jpg': unsplash('photo-1493225457124-a3eb161ffa5f', 400, 400),
  'sonu-nigam.jpg': unsplash('photo-1470225620780-dba8ba36b745', 400, 400),
  'kk.jpg': unsplash('photo-1459745458510-839cf707a1cf', 400, 400),
  'jubin-nautiyal.jpg': unsplash('photo-1510915361894-db8b60106cb1', 400, 400),
  'darshan-raval.jpg': unsplash('photo-1514525253161-7a46d19cd819', 400, 400),
  'armaan-malik.jpg': unsplash('photo-1598488035139-bdbb2231bb30', 400, 400),
  'vishal-mishra.jpg': unsplash('photo-1520523839897-bd0b52f945a0', 400, 400),
  'neha-kakkar.jpg': unsplash('photo-1514525251171-b5885287b69f', 400, 400),
  'badshah.jpg': unsplash('photo-1571330735068-603aa3bb5aec', 400, 400),
  'yo-yo-honey-singh.jpg': unsplash('photo-1571266028247-4d4d4dbe9daa', 400, 400),
  'diljit-dosanjh.jpg': unsplash('photo-1533177311580-f0ad82ff2892', 400, 400),
  'ar-rahman.jpg': unsplash('photo-1507838179154-865270863ad5', 400, 400),
  'sunidhi-chauhan.jpg': unsplash('photo-1506152983158-b4a23a150159', 400, 400),
  'mohit-chauhan.jpg': unsplash('photo-1467810563316-b5476575f562', 400, 400),
  'shankar-mahadevan.jpg': unsplash('photo-1514320291840-7555a10ea9ff', 400, 400),
  'pritam.jpg': unsplash('photo-1598655647840-d5cb959092a7', 400, 400),
  'sachet-tandon.jpg': unsplash('photo-1485579149621-3122dd97985f', 400, 400),
  'parampara-tandon.jpg': unsplash('photo-1524368535928-14b320baad71', 400, 400),
};

const albums = {
  'top-hits.jpg': unsplash('photo-1614613535308-eb5f3967d28f', 640, 640),
  'romantic.jpg': unsplash('photo-1518199266791-5375a83190f4', 640, 640),
  'lofi.jpg': unsplash('photo-1519681393784-d120267933ba', 640, 640),
  'workout.jpg': unsplash('photo-1534438327276-14e5300c3a48', 640, 640),
  'party.jpg': unsplash('photo-1470229722913-7c0e2dbbafd3', 640, 640),
  'punjabi.jpg': unsplash('photo-1493225457124-a3eb161ffa5f', 640, 640),
  'love.jpg': unsplash('photo-1511671782779-c97d3d27a1d4', 640, 640),
  'hiphop.jpg': unsplash('photo-1571330735068-603aa3bb5aec', 640, 640),
  'retro.jpg': unsplash('photo-1619983081563-430f63602796', 640, 640),
  'acoustic.jpg': unsplash('photo-1510915361894-db8b60106cb1', 640, 640),
};

const playlists = {
  'chill-mix.jpg': albums['lofi.jpg'],
  'night-drive.jpg': unsplash('photo-1449824913935-59a10b8d2000', 640, 640),
  'bollywood-mix.jpg': unsplash('photo-1485579149621-3122dd97985f', 640, 640),
  'lofi-beats.jpg': albums['lofi.jpg'],
  'workout-mix.jpg': albums['workout.jpg'],
};

const banners = {
  'hero-banner.jpg': unsplash('photo-1459745458510-839cf707a1cf', 1400, 500),
};

async function download(url, dest) {
  if (existsSync(dest)) {
    console.log('skip', dest);
    return;
  }
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  console.log('saved', dest);
}

async function main() {
  for (const dir of ['artists', 'albums', 'playlists', 'banners', 'logo']) {
    mkdirSync(`${BASE}/${dir}`, { recursive: true });
  }

  for (const [name, url] of Object.entries(artists)) {
    await download(url, `${BASE}/artists/${name}`);
  }
  for (const [name, url] of Object.entries(albums)) {
    await download(url, `${BASE}/albums/${name}`);
  }
  for (const [name, url] of Object.entries(playlists)) {
    await download(url, `${BASE}/playlists/${name}`);
  }
  for (const [name, url] of Object.entries(banners)) {
    await download(url, `${BASE}/banners/${name}`);
  }

  console.log('All images downloaded.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
