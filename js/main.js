(function ($) {
  "use strict";

  var DATA = window.SPOTIFY_DATA;

  /* ── Icon strings (kept for render helpers only — player.js owns player-button icons) ── */
  var playIcon     = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  var verifiedIcon = '<svg class="verified-badge" viewBox="0 0 24 24" aria-label="Verified"><path fill="#3D91F4" d="M12 2l2.4 1.2 2.6-.2 1.8 2-2 2.2.4 2.6-2.2 1.8-2.6-.4-2.4 1.2-2.4-1.2-2.6.4-2.2-1.8 2-2.2-1.8-2 2.6.2L12 2z"/><path fill="#fff" d="M10 12.2l1.8 1.8 3.4-3.6-1.4-1.4-2 2.1-.4-.4-1.4 1.5z"/></svg>';

  var toastTimer;
  var playlistCount = 1;

  /* ── Toast ── */
  function showToast(message) {
    clearTimeout(toastTimer);
    $(".toast").text(message).addClass("is-visible");
    toastTimer = setTimeout(function () { $(".toast").removeClass("is-visible"); }, 1800);
  }

  /* ── Style range input (delegate to player.js version for consistency) ── */
  function styleRange(input) {
    var value = input.value + "%";
    input.style.background = "linear-gradient(90deg, #1DB954 " + value + ", #535353 " + value + ")";
  }

  /* ── Read song data from a clicked card element ── */
  function readSongData($source) {
    var el = $source.closest("[data-song]")[0] || $source[0];
    if (!el) return { song: "", artist: "", cover: "" };
    var img = el.querySelector("img");
    return {
      song:     el.dataset.song     || (el.querySelector("h3, strong") || {}).textContent || "",
      artist:   el.dataset.artist   || (el.querySelector("p, small, .artist-name") || {}).textContent || "Spotify",
      cover:    el.dataset.cover    || (img && img.getAttribute("src")) || "",
      duration: Number(el.dataset.duration) || undefined
    };
  }

  /* ── Render helpers ── */
  function playBtn(label) {
    return '<button class="floating-play ripple" type="button" aria-label="Play ' + label + '">' + playIcon + '</button>';
  }

  function favBtn() {
    return '<button class="card-fav ripple" type="button" aria-label="Save to library"><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.35-9.5-9.25C.9 7.85 3.25 4.5 6.9 4.5c2.1 0 3.65 1.1 5.1 2.85C13.45 5.6 15 4.5 17.1 4.5c3.65 0 6 3.35 4.4 7.25C19.5 16.65 12 21 12 21Z"/></svg></button>';
  }

  function renderQuickGrid() {
    var items = DATA.playlists.slice(0, 6);
    var html = items.map(function (p) {
      return '<article class="quick-card slide-up" data-song="' + p.song + '" data-artist="' + p.desc + '" data-cover="' + p.cover + '" data-type="playlist">' +
        '<img src="' + p.cover + '" alt="' + p.title + '" loading="lazy">' +
        '<h3>' + p.title + '</h3>' + playBtn(p.title) + '</article>';
    }).join("");
    $("#quick-grid").html(html);
  }

  function renderArtistCard(a) {
    return '<article class="artist-card slide-up" data-song="' + a.song + '" data-artist="' + a.name + '" data-cover="' + a.cover + '" data-type="artist" data-search="' + a.name.toLowerCase() + '">' +
      '<div class="artist-img-wrap"><img src="' + a.cover + '" alt="' + a.name + '" loading="lazy">' + playBtn(a.name) + '</div>' +
      '<h3>' + a.name + (a.verified ? verifiedIcon : "") + '</h3>' +
      '<p class="artist-meta">Artist · ' + a.listeners + ' listeners</p></article>';
  }

  function renderAlbumCard(a) {
    return '<article class="album-card media-card slide-up" data-song="' + a.song + '" data-artist="' + a.artist + '" data-cover="' + a.cover + '" data-duration="' + (a.duration || "") + '" data-type="album" data-search="' + (a.title + " " + a.artist).toLowerCase() + '">' +
      '<div class="card-img-wrap"><img src="' + a.cover + '" alt="' + a.title + '" loading="lazy">' + playBtn(a.title) + favBtn() + '</div>' +
      '<h3>' + a.title + '</h3><p>' + a.artist + '</p><span class="card-duration">' + a.duration + '</span></article>';
  }

  function renderMediaCard(item, type) {
    var title = item.title || item.song;
    var desc  = item.desc  || item.host || item.artist || "";
    var cover = item.cover;
    var song  = item.song  || title;
    return '<article class="media-card slide-up" data-song="' + song + '" data-artist="' + desc + '" data-cover="' + cover + '" data-type="' + type + '" data-search="' + (title + " " + desc).toLowerCase() + '">' +
      '<div class="card-img-wrap"><img src="' + cover + '" alt="' + title + '" loading="lazy">' + playBtn(title) + '</div>' +
      '<h3>' + title + '</h3><p>' + desc + '</p></article>';
  }

  function renderSection(id, title, content) {
    return '<section class="music-section fade-in" id="' + id + '" data-section="' + id + '">' +
      '<div class="section-title"><h2>' + title + '</h2><a href="#" class="show-all">Show all</a></div>' +
      '<div class="card-row scroll-row">' + content + '</div></section>';
  }

  function renderHomeSections() {
    var html = "";
    html += renderSection("recently-played",    "Recently Played",    DATA.albums.slice(0, 5).map(renderAlbumCard).join(""));
    html += renderSection("trending-albums",    "Trending Albums",    DATA.albums.map(renderAlbumCard).join(""));
    html += '<section class="music-section fade-in" id="popular-artists" data-section="popular-artists">' +
      '<div class="section-title"><h2>Popular Artists</h2><a href="#" class="show-all">Show all</a></div>' +
      '<div class="card-row scroll-row artist-row">' + DATA.artists.map(renderArtistCard).join("") + '</div></section>';
    html += renderSection("made-for-you",       "Made For You",       DATA.playlists.map(function (p) { return renderMediaCard(p, "playlist"); }).join(""));
    html += renderSection("recommended-songs",  "Recommended Songs",  DATA.songs.slice(0, 8).map(function (s) {
      return renderMediaCard({ title: s.song, desc: s.artist + " · " + s.album, cover: s.cover, song: s.song }, "song");
    }).join(""));
    html += renderSection("popular-podcasts",   "Popular Podcasts",   DATA.podcasts.map(function (p) { return renderMediaCard(p, "podcast"); }).join(""));
    html += renderSection("new-releases",       "New Releases",       DATA.albums.slice(3).concat(DATA.albums.slice(0, 3)).map(renderAlbumCard).join(""));
    html += renderSection("charts",             "Charts",             DATA.charts.map(function (c) { return renderMediaCard(c, "chart"); }).join(""));
    html += renderSection("mood-playlists",     "Mood Playlists",     DATA.moods.map(function (m) { return renderMediaCard(m, "mood"); }).join(""));
    html += renderSection("continue-listening", "Continue Listening", DATA.playlists.slice(0, 4).map(function (p) { return renderMediaCard(p, "playlist"); }).join(""));
    $("#home-sections").html(html);
  }

  function renderLibrary() {
    var html = DATA.playlists.slice(0, 2).map(function (p) {
      return '<button class="library-item" type="button" data-type="playlist" data-song="' + p.song + '" data-artist="' + p.desc + '" data-cover="' + p.cover + '">' +
        '<img src="' + p.cover + '" alt="" loading="lazy"><span><strong>' + p.title + '</strong><small>Playlist</small></span></button>';
    }).join("");
    html += DATA.artists.slice(0, 2).map(function (a) {
      return '<button class="library-item" type="button" data-type="artist" data-song="' + a.song + '" data-artist="' + a.name + '" data-cover="' + a.cover + '">' +
        '<img src="' + a.cover + '" alt="" loading="lazy"><span><strong>' + a.name + '</strong><small>Artist</small></span></button>';
    }).join("");
    $("#library-list").html(html);
  }

  /* ── Search ── */
  function buildSearchIndex() {
    var index = [];
    DATA.artists.forEach(function (a)  { index.push({ type: "Artist",   title: a.name,  subtitle: a.listeners + " listeners", cover: a.cover, song: a.song,  artist: a.name   }); });
    DATA.albums.forEach(function (a)   { index.push({ type: "Album",    title: a.title, subtitle: a.artist,                   cover: a.cover, song: a.song,  artist: a.artist }); });
    DATA.songs.forEach(function (s)    { index.push({ type: "Song",     title: s.song,  subtitle: s.artist + " · " + s.album, cover: s.cover, song: s.song,  artist: s.artist }); });
    DATA.playlists.forEach(function (p){ index.push({ type: "Playlist", title: p.title, subtitle: p.desc,                     cover: p.cover, song: p.song,  artist: p.desc   }); });
    return index;
  }

  var searchIndex = buildSearchIndex();

  function runSearch(query) {
    query = query.trim().toLowerCase();
    var $sections      = $(".quick-section, .music-section");
    var $noResults     = $("#no-results");
    var $searchResults = $("#search-results");

    if (!query) {
      $sections.show();
      $noResults.removeClass("is-visible");
      $searchResults.attr("aria-hidden", "true").empty();
      $(".media-card, .quick-card, .artist-card, .album-card").removeClass("is-filtered-out");
      return;
    }

    var matches = searchIndex.filter(function (item) {
      return (item.title + " " + item.subtitle + " " + item.type).toLowerCase().indexOf(query) !== -1;
    });

    $("[data-search], .media-card, .quick-card, .artist-card, .album-card").each(function () {
      var text = (this.textContent + " " + (this.dataset.song || "") + " " + (this.dataset.artist || "") + " " + (this.dataset.search || "")).toLowerCase();
      this.classList.toggle("is-filtered-out", text.indexOf(query) === -1);
    });

    var anyVisible = $(".media-card:not(.is-filtered-out), .quick-card:not(.is-filtered-out), .artist-card:not(.is-filtered-out), .album-card:not(.is-filtered-out)").length > 0;
    $noResults.toggleClass("is-visible", !anyVisible && matches.length === 0);

    if (matches.length) {
      var html = '<div class="search-results-inner"><h2>Search Results</h2><div class="search-results-grid">';
      matches.slice(0, 12).forEach(function (m) {
        html += '<button class="search-result-item" type="button" data-song="' + m.song + '" data-artist="' + m.artist + '" data-cover="' + m.cover + '">' +
          '<img src="' + m.cover + '" alt="" loading="lazy"><span><strong>' + m.title + '</strong><small>' + m.type + ' · ' + m.subtitle + '</small></span></button>';
      });
      html += "</div></div>";
      $searchResults.html(html).attr("aria-hidden", "false");
    } else {
      $searchResults.attr("aria-hidden", "true").empty();
    }
  }

  /* ── Mobile menu ── */
  function openMobileMenu() {
    $(".sidebar").addClass("is-open");
    $(".mobile-overlay").addClass("is-visible").attr("aria-hidden", "false");
    document.body.classList.add("menu-open");
  }

  function closeMobileMenu() {
    $(".sidebar").removeClass("is-open");
    $(".mobile-overlay").removeClass("is-visible").attr("aria-hidden", "true");
    document.body.classList.remove("menu-open");
  }

  /* ── Ripple effect ── */
  $(document).on("click", ".ripple", function (e) {
    var btn    = this;
    var rect   = btn.getBoundingClientRect();
    var ripple = document.createElement("span");
    ripple.className  = "ripple-effect";
    ripple.style.left = (e.clientX - rect.left) + "px";
    ripple.style.top  = (e.clientY - rect.top)  + "px";
    btn.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 600);
  });

  /* ════════════════════════════════════════════
     Init — runs once DOM is ready
  ════════════════════════════════════════════ */
  $(function () {

    /* ── Render all UI sections ── */
    renderQuickGrid();
    renderHomeSections();
    renderLibrary();

    /* ── Boot loader animation ── */
    setTimeout(function () {
      $(".app-loader").addClass("is-hidden");
      document.body.classList.add("is-ready");
    }, 800);

    /* ── Initialise real audio player & restore saved session ── */
    var savedState = SpotifyPlayer.init();

    // Restore shuffle / repeat button visual state from localStorage
    $(".shuffle-btn").toggleClass("is-active", savedState.shuffleOn);
    $(".repeat-btn").toggleClass("is-active", savedState.repeatMode > 0);
    if (savedState.repeatMode === 2) {
      $(".repeat-btn").css("opacity", "1");   // brighter = repeat-one indicator
    }

    /* ── Navigation ── */
    $(".nav-item, .brand").on("click", function (e) {
      var target = this.getAttribute("href");
      if (target && target.charAt(0) === "#") {
        e.preventDefault();
        var area = document.querySelector(".content-area");
        var el   = document.querySelector(target);
        if (area && el) area.scrollTo({ top: el.offsetTop - 74, behavior: "smooth" });
        if (target === "#search") $("#search-input").focus();
      }
      $(".nav-item").removeClass("active");
      if (this.classList.contains("nav-item")) $(this).addClass("active");
      closeMobileMenu();
    });

    $(".hamburger-open").on("click", openMobileMenu);
    $(".hamburger-close, .mobile-overlay").on("click", closeMobileMenu);

    /* ── Playback triggers (card / button clicks) ── */
    $(document).on("click",
      ".floating-play, .quick-card, .media-card, .artist-card, .album-card, " +
      ".queue-item, .library-item, .primary-play, .search-result-item",
      function (e) {
        // Premium button inside a card — let it bubble to its own handler
        if ($(e.target).closest(".premium-confirm").length) return;

        // Favourite (heart) button on card — just toggle, don't play
        if ($(e.target).closest(".card-fav").length) {
          $(e.target).closest(".card-fav").toggleClass("active");
          showToast("Saved to library");
          return;
        }

        e.preventDefault();
        var data = readSongData($(this));
        if (!data.song) return;

        SpotifyPlayer.playByName(data.song, data.artist, data.cover, data.duration);
        $(".app-shell").removeClass("right-panel-closed");
      }
    );

    /* ── Player controls ── */

    // Play / Pause
    $(".player-button.play").on("click", function () {
      SpotifyPlayer.togglePlayPause();
    });

    // Previous
    $(".prev-btn").on("click", function () {
      SpotifyPlayer.playPrev();
      showToast("Previous track");
    });

    // Next
    $(".next-btn").on("click", function () {
      SpotifyPlayer.playNext(false);
      showToast("Next track");
    });

    // Shuffle toggle
    $(".shuffle-btn").on("click", function () {
      var on = !SpotifyPlayer.getShuffle();
      SpotifyPlayer.setShuffle(on);
      $(this).toggleClass("is-active", on);
      showToast("Shuffle " + (on ? "on" : "off"));
    });

    // Repeat cycle: off → all → one → off
    $(".repeat-btn").on("click", function () {
      var mode = (SpotifyPlayer.getRepeat() + 1) % 3;
      SpotifyPlayer.setRepeat(mode);
      $(this).toggleClass("is-active", mode > 0);
      $(this).css("opacity", mode === 2 ? "1" : "");   // extra-bright on repeat-one
      var labels = ["Repeat off", "Repeat all", "Repeat one"];
      showToast(labels[mode]);
    });

    /* ── Progress bar (seek) ── */
    $(".progress-range")
      .on("mousedown touchstart", function () {
        this._seeking = true;    // flag read by player.js to pause range updates
      })
      .on("input", function () {
        styleRange(this);
        SpotifyPlayer.seek(Number(this.value));
      })
      .on("mouseup touchend change", function () {
        this._seeking = false;
      });

    /* ── Volume slider ── */
    $(".volume-range").on("input", function () {
      styleRange(this);
      SpotifyPlayer.setVolume(Number(this.value));
    });

    /* ── Mute / unmute button ── */
    $(".volume-btn").on("click", function () {
      var muted = SpotifyPlayer.toggleMute();
      showToast(muted ? "Muted" : "Volume on");
    });

    /* ── Search ── */
    $("#search-input").on("input", function () { runSearch(this.value); });

    /* ── Like / heart button ── */
    $(".heart-button").on("click", function () {
      $(this).toggleClass("active");
      showToast($(this).hasClass("active") ? "Added to Liked Songs" : "Removed from Liked Songs");
    });

    /* ── Keyboard shortcuts ── */
    $(document).on("keydown", function (e) {
      if (e.target.matches("input, textarea")) return;

      var volRange;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          SpotifyPlayer.togglePlayPause();
          break;

        case "ArrowRight":
          e.preventDefault();
          SpotifyPlayer.playNext(false);
          showToast("Next track");
          break;

        case "ArrowLeft":
          e.preventDefault();
          SpotifyPlayer.playPrev();
          showToast("Previous track");
          break;

        case "ArrowUp":
          e.preventDefault();
          volRange = document.querySelector(".volume-range");
          if (volRange) {
            volRange.value = Math.min(100, Number(volRange.value) + 5);
            $(volRange).trigger("input");
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          volRange = document.querySelector(".volume-range");
          if (volRange) {
            volRange.value = Math.max(0, Number(volRange.value) - 5);
            $(volRange).trigger("input");
          }
          break;

        case "KeyM":
          $(".volume-btn").click();
          break;

        case "KeyS":
          e.preventDefault();
          $("#search-input").focus();
          break;
      }
    });

    /* ── History navigation buttons ── */
    $(".round-button[aria-label='Go back']").on("click", function () {
      document.querySelector(".content-area").scrollBy({ top: -420, behavior: "smooth" });
    });
    $(".round-button[aria-label='Go forward']").on("click", function () {
      document.querySelector(".content-area").scrollBy({ top: 420, behavior: "smooth" });
    });

    /* ── Library filter tabs ── */
    $(".library-filter").on("click", function () {
      var filter = $(this).data("filter");
      $(".library-filter").removeClass("active");
      $(this).addClass("active");
      $(".library-item").each(function () {
        this.style.display = (filter === "all" || this.dataset.type === filter) ? "flex" : "none";
      });
    });

    /* ── Create playlist ── */
    $(".create-button, .panel-heading .icon-button").on("click", function () {
      playlistCount += 1;
      var name  = "My Playlist #" + playlistCount;
      var cover = DATA.playlists[0].cover;
      var btn   = '<button class="library-item" type="button" data-type="playlist" data-song="' + name + '" data-artist="New playlist" data-cover="' + cover + '">' +
        '<img src="' + cover + '" alt="" loading="lazy"><span><strong>' + name + '</strong><small>Playlist</small></span></button>';
      $("#library-list").prepend(btn);
      showToast("Playlist created");
    });

    /* ── Liked Songs ── */
    $(".liked-button").on("click", function () {
      SpotifyPlayer.playByName("Tum Hi Ho", "Arijit Singh", DATA.songs[0].cover);
      showToast("Playing Liked Songs");
    });

    /* ── Lyrics overlay ── */
    $(".lyrics-btn").on("click", function () {
      $(".lyrics-panel").addClass("is-open").attr("aria-hidden", "false");
      $(this).addClass("is-active");
    });

    /* ── Queue panel ── */
    $(".queue-btn, .queue-box a").on("click", function (e) {
      e.preventDefault();
      $(".app-shell").removeClass("right-panel-closed");
      showToast("Queue opened");
    });

    /* ── Now-Playing side panel close ── */
    $(".close-panel-button").on("click", function () {
      $(".app-shell").addClass("right-panel-closed");
    });

    /* ── Premium overlay ── */
    $(".premium-button").on("click", function () {
      $(".premium-panel").addClass("is-open").attr("aria-hidden", "false");
    });

    $(".premium-confirm").on("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $(".overlay-panel").removeClass("is-open").attr("aria-hidden", "true");
      showToast("Premium preview activated");
    });

    /* ── Install app ── */
    $(".install-button").on("click", function () {
      showToast("App marked as installed");
    });

    /* ── Profile dropdown ── */
    $(".avatar-button").on("click", function (e) {
      e.stopPropagation();
      document.querySelector(".profile-menu").classList.toggle("is-open");
    });
    $(document).on("click", function (e) {
      if (!e.target.closest(".profile-menu, .avatar-button")) {
        $(".profile-menu").removeClass("is-open");
      }
    });

    /* ── Overlay close (lyrics, premium) ── */
    $(".overlay-close, .overlay-panel").on("click", function (e) {
      if (e.target !== this && !e.target.classList.contains("overlay-close")) return;
      $(".overlay-panel").removeClass("is-open").attr("aria-hidden", "true");
      $(".lyrics-btn").removeClass("is-active");
    });

    /* ── Show all / Show less toggle ── */
    $(document).on("click", ".show-all", function (e) {
      e.preventDefault();
      var row = $(this).closest("section").find(".card-row, .quick-grid")[0];
      if (!row) return;
      row.classList.toggle("is-expanded");
      this.textContent = row.classList.contains("is-expanded") ? "Show less" : "Show all";
    });

  }); // end DOM-ready

})(window.jQuery);