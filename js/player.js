/**
 * js/player.js — Real HTMLAudioElement engine for Spotify Clone
 * Exposes: window.SpotifyPlayer
 *
 * Responsibilities:
 *   - Owns the single Audio instance
 *   - Handles all audio events (play, pause, timeupdate, ended, error)
 *   - Updates player-bar UI (progress, time, cover, song/artist, play button)
 *   - Manages localStorage persistence
 *   - Exposes a clean API — main.js calls SpotifyPlayer.* for everything
 *
 * Does NOT bind DOM click/input events — main.js owns those.
 */
(function () {
  "use strict";

  /* ── LocalStorage keys ── */
  var KEYS = {
    volume:    "sp_volume",
    repeat:    "sp_repeat",
    shuffle:   "sp_shuffle",
    lastIndex: "sp_last_index",
    lastPos:   "sp_last_position"
  };

  /* ── State ── */
  var audio       = new Audio();
  var tracks      = [];
  var currentIdx  = 0;
  var shuffleOn   = false;
  var repeatMode  = 0;   // 0 = off | 1 = repeat all | 2 = repeat one
  var lastVolume  = 72;
  var pendingSeek = 0;   // seconds to seek once audio is ready

  /* ── SVG icons (kept in sync with main.js definitions) ── */
  var PLAY_ICON  = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  var PAUSE_ICON = '<svg viewBox="0 0 24 24"><path d="M8 5h3v14H8zM13 5h3v14h-3z"/></svg>';
  var VOL_ICON   = '<svg viewBox="0 0 24 24"><path d="M5 9v6h4l5 4V5L9 9zM18 9.5a4 4 0 0 1 0 5"/></svg>';
  var MUTE_ICON  = '<svg viewBox="0 0 24 24"><path d="M5 9v6h4l5 4V5L9 9zM19 9l-4 4m0-4 4 4"/></svg>';

  /* ── Minimal DOM helpers (no jQuery dependency) ── */
  function qs(sel)  { return document.querySelector(sel); }
  function qsa(sel) { return document.querySelectorAll(sel); }

  /* ── Toast (standalone, works before jQuery is ready) ── */
  var _toastTimer;
  function _toast(msg) {
    var el = qs(".toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { el.classList.remove("is-visible"); }, 1800);
  }

  /* ── Time formatter ── */
  function _fmt(s) {
    s = Math.max(0, Math.floor(s || 0));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  /* ── Range styling helper (exposed on public API for main.js) ── */
  function styleRange(input) {
    var v = input.value + "%";
    input.style.background = "linear-gradient(90deg,#1DB954 " + v + ",#535353 " + v + ")";
  }

  /* ────────────────────────────────────────────
     Storage
  ─────────────────────────────────────────── */
  function _save() {
    try {
      localStorage.setItem(KEYS.volume,    lastVolume);
      localStorage.setItem(KEYS.repeat,    repeatMode);
      localStorage.setItem(KEYS.shuffle,   shuffleOn);
      localStorage.setItem(KEYS.lastIndex, currentIdx);
      localStorage.setItem(KEYS.lastPos,   Math.floor(audio.currentTime || 0));
    } catch (e) { /* storage unavailable */ }
  }

  function _restore() {
    try {
      var v = localStorage.getItem(KEYS.volume);
      if (v !== null) lastVolume = +v;

      var r = localStorage.getItem(KEYS.repeat);
      if (r !== null) repeatMode = +r;

      var s = localStorage.getItem(KEYS.shuffle);
      if (s !== null) shuffleOn = (s === "true");

      var i = localStorage.getItem(KEYS.lastIndex);
      if (i !== null) currentIdx = +i;

      var p = localStorage.getItem(KEYS.lastPos);
      return p !== null ? +p : 0;
    } catch (e) { return 0; }
  }

  /* ────────────────────────────────────────────
     UI Updaters — player.js is sole owner of these
  ─────────────────────────────────────────── */

  /** Update the central play/pause button icon + aria-label + class */
  function _updatePlayBtn(playing) {
    var btn = qs(".player-button.play");
    if (!btn) return;
    btn.classList.toggle("is-playing", playing);
    btn.setAttribute("aria-label", playing ? "Pause" : "Play");
    btn.innerHTML = playing ? PAUSE_ICON : PLAY_ICON;
  }

  /** Sync all "now playing" text / images across player bar + side panel */
  function _updateNowPlayingUI(track) {
    if (!track) return;
    function setText(sel, val) { var el = qs(sel); if (el) el.textContent = val || ""; }
    function setSrc(sel, val)  { var el = qs(sel); if (el && val) el.setAttribute("src", val); }

    setText(".player-song",    track.song);
    setText(".player-artist",  track.artist);
    setSrc (".player-cover",   track.cover);
    setSrc (".now-art-large",  track.cover);
    setText(".now-details h3", track.song);
    setText(".now-details p",  track.artist);
    setText(".lyrics-title",   track.song);
  }

  /** Highlight the currently playing card in the grid */
  function _updateActiveCards(song) {
    // Remove from all cards
    qsa("[data-song]").forEach(function (el) {
      el.classList.remove("is-playing");
      var fp = el.querySelector(".floating-play");
      if (fp) fp.classList.remove("is-visible");
    });
    if (!song) return;
    // Add to matching cards (compare via dataset to avoid CSS.escape dependency)
    qsa("[data-song]").forEach(function (el) {
      if (el.dataset.song === song) {
        el.classList.add("is-playing");
        var fp = el.querySelector(".floating-play");
        if (fp) fp.classList.add("is-visible");
      }
    });
  }

  /** Sync progress bar + time labels from audio.currentTime / audio.duration */
  function _updateProgress() {
    var cur = audio.currentTime || 0;
    var dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    var pct = dur ? (cur / dur) * 100 : 0;

    var range = qs(".progress-range");
    if (range && !range._seeking) {
      range.value = pct;
      styleRange(range);
    }

    var tc = qs(".time-current"); if (tc) tc.textContent = _fmt(cur);
    var td = qs(".time-duration"); if (td) td.textContent = _fmt(dur);
  }

  /** Sync volume slider + mute button icon */
  function _updateVolumeUI(vol) {
    var range = qs(".volume-range");
    if (range) { range.value = vol; styleRange(range); }

    var btn = qs(".volume-btn");
    if (btn) {
      var muted = (vol === 0) || audio.muted;
      btn.classList.toggle("is-active", muted);
      btn.innerHTML = muted ? MUTE_ICON : VOL_ICON;
    }
  }

  /** Rebuild the "Next in queue" panel from current position */
  function _updateQueueDisplay() {
    var list = qs("#queue-list");
    if (!list) return;
    var next = tracks.slice(currentIdx + 1, currentIdx + 4);
    list.innerHTML = next.map(function (t) {
      return (
        '<button class="queue-item" type="button"' +
        ' data-song="'   + (t.song   || "") + '"' +
        ' data-artist="' + (t.artist || "") + '"' +
        ' data-cover="'  + (t.cover  || "") + '">' +
        '<img src="' + (t.cover || "") + '" alt="" loading="lazy">' +
        '<span><strong>' + (t.song || "") + '</strong>' +
        '<small>' + (t.artist || "") + '</small></span></button>'
      );
    }).join("");
  }

  /* ────────────────────────────────────────────
     Pending-seek helper (apply once metadata loads)
  ─────────────────────────────────────────── */
  function _applyPendingSeek() {
    if (pendingSeek > 0 && isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = Math.min(pendingSeek, audio.duration - 1);
      pendingSeek = 0;
    }
  }

  /* ────────────────────────────────────────────
     Core track loader
  ─────────────────────────────────────────── */
  function _loadTrack(idx, autoplay, seekTo) {
    if (!tracks.length) return;

    // Normalise index with wrap-around
    idx = ((idx % tracks.length) + tracks.length) % tracks.length;
    currentIdx = idx;
    var track = tracks[currentIdx];

    // Update all UI surfaces immediately (instant feedback)
    _updateNowPlayingUI(track);
    _updateActiveCards(track.song);
    _updateQueueDisplay();

    // Tear down previous audio to free resources
    audio.pause();
    audio.removeAttribute("src");
    audio.load();   // abort any pending HTTP request

    if (!track.audio) {
      // Song exists in data but no audio file mapped
      _updatePlayBtn(false);
      _updateProgress();
      _toast("No audio file for: " + track.song);
      _save();
      return;
    }

    audio.src   = track.audio;
    pendingSeek = seekTo || 0;
    audio.load();

    if (autoplay) {
      var promise = audio.play();
      if (promise) {
        promise.catch(function () {
          // Autoplay blocked by browser policy — show as paused, user can click play
          _updatePlayBtn(false);
        });
      }
    }

    _save();
  }

  /* ────────────────────────────────────────────
     Audio event listeners
  ─────────────────────────────────────────── */
  audio.addEventListener("play",  function () { _updatePlayBtn(true);  });
  audio.addEventListener("pause", function () { _updatePlayBtn(false); });

  audio.addEventListener("timeupdate", function () {
    _updateProgress();
    // Persist position every 10 seconds (cheap throttle)
    if (Math.floor(audio.currentTime) % 10 === 0 && audio.currentTime > 0) {
      _save();
    }
  });

  audio.addEventListener("loadedmetadata", function () {
    _applyPendingSeek();
    _updateProgress();
  });

  audio.addEventListener("canplay", function () {
    _applyPendingSeek();
  });

  audio.addEventListener("ended", function () {
    if (repeatMode === 2) {
      // Repeat One — restart same track
      audio.currentTime = 0;
      audio.play().catch(function () {});
    } else {
      SP.playNext(true /* isAuto */);
    }
  });

  audio.addEventListener("error", function () {
    _toast("Could not load audio");
    _updatePlayBtn(false);
  });

  /* ────────────────────────────────────────────
     Public API  —  window.SpotifyPlayer
  ─────────────────────────────────────────── */
  var SP = {

    /**
     * init(songList?)
     * Called once by main.js after DOM is ready.
     * Returns { repeatMode, shuffleOn, volume } so main.js can restore button states.
     */
    init: function (songList) {
      tracks = ((songList || (window.SPOTIFY_DATA && window.SPOTIFY_DATA.songs)) || []).slice();

      var savedPos = _restore();   // reads localStorage → mutates lastVolume/repeatMode/shuffleOn/currentIdx
      currentIdx   = Math.max(0, Math.min(currentIdx, tracks.length - 1));

      // Apply restored volume immediately
      audio.volume = lastVolume / 100;
      _updateVolumeUI(lastVolume);

      // Restore last track into UI without autoplaying
      var track = tracks[currentIdx];
      if (track) {
        _updateNowPlayingUI(track);
        _updateActiveCards(track.song);
        _updateQueueDisplay();

        if (track.audio) {
          audio.src   = track.audio;
          pendingSeek = savedPos;
          audio.load();   // preload; seek applied on loadedmetadata/canplay
        }

        _updateProgress();
      }

      // Return saved state for main.js to update toggle-button classes
      return { repeatMode: repeatMode, shuffleOn: shuffleOn, volume: lastVolume };
    },

    /** Play track at array index (0-based) */
    playSong: function (idx) {
      _loadTrack(idx, true, 0);
    },

    /**
     * playByName(song, artist, cover, duration?)
     * Finds track by name; pushes an ad-hoc entry if not found.
     * Used by card click handlers in main.js.
     */
    playByName: function (song, artist, cover, duration) {
      var idx = -1;
      for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].song === song) { idx = i; break; }
      }
      if (idx === -1) {
        tracks.push({
          song:     song,
          artist:   artist   || "",
          cover:    cover    || "",
          duration: duration || 210,
          audio:    null
        });
        idx = tracks.length - 1;
      }
      _loadTrack(idx, true, 0);
    },

    /** Toggle play / pause on the current track */
    togglePlayPause: function () {
      // Nothing loaded yet → load & play current index
      if (!audio.src || audio.src === location.href) {
        _loadTrack(currentIdx, true, 0);
        return;
      }
      if (audio.paused) {
        audio.play().catch(function () {});
      } else {
        audio.pause();
      }
    },

    /**
     * playNext(isAuto)
     * isAuto = true when called from the 'ended' event (no toast shown by main.js)
     */
    playNext: function (isAuto) {
      var next;
      if (shuffleOn) {
        var tries = 0;
        do {
          next = Math.floor(Math.random() * tracks.length);
          tries++;
        } while (tracks.length > 1 && next === currentIdx && tries < 20);
      } else {
        next = currentIdx + 1;
      }

      if (next >= tracks.length) {
        if (repeatMode >= 1) {
          next = 0;
        } else if (isAuto) {
          _updatePlayBtn(false);
          return;
        } else {
          next = 0;
        }
      }

      _loadTrack(next, true, 0);
    },

    /** Previous: restart if >3 s in, otherwise go to previous track */
    playPrev: function () {
      if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
      }
      _loadTrack(((currentIdx - 1) + tracks.length) % tracks.length, true, 0);
    },

    /**
     * seek(pct)  — pct is 0–100 from the progress range input
     */
    seek: function (pct) {
      if (isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (pct / 100) * audio.duration;
      }
    },

    /** setVolume(vol) — vol is 0–100 */
    setVolume: function (vol) {
      lastVolume   = vol;
      audio.volume = vol / 100;
      audio.muted  = (vol === 0);
      _updateVolumeUI(vol);
      _save();
    },

    /**
     * toggleMute()
     * Returns true if now muted, false if now unmuted.
     * Also updates the volume slider and button icon.
     */
    toggleMute: function () {
      var range = qs(".volume-range");
      if (!range) return false;

      if (audio.muted || +range.value === 0) {
        // Unmute
        audio.muted  = false;
        var restore  = lastVolume || 72;
        audio.volume = restore / 100;
        range.value  = restore;
      } else {
        // Mute
        lastVolume  = +range.value;
        audio.muted = true;
        range.value = 0;
      }

      styleRange(range);
      _updateVolumeUI(+range.value);
      _save();
      return audio.muted;
    },

    /** setShuffle(bool) */
    setShuffle: function (on) { shuffleOn = on; _save(); },

    /** setRepeat(0|1|2) — 0=off, 1=all, 2=one */
    setRepeat: function (mode) { repeatMode = mode; _save(); },

    /* ── Getters ── */
    getShuffle:  function () { return shuffleOn;  },
    getRepeat:   function () { return repeatMode; },
    getVolume:   function () { return lastVolume; },
    isPlaying:   function () { return !audio.paused; },
    getIdx:      function () { return currentIdx; },
    getTracks:   function () { return tracks; },

    /** Expose styleRange so main.js can call it for any range it creates */
    styleRange: styleRange
  };

  window.SpotifyPlayer = SP;
})();
