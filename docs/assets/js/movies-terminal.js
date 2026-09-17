// Browser-side front end for the movie_seanses scraper (github.com/Alltairas/APIs).
// Reads the same filter syntax as run.sh / scraper.py's CLI, but against a static
// matches.json snapshot published by a scheduled job, instead of a live Telegram bot.
(function () {
  const root = document.getElementById('movie-term');
  if (!root) return;

  const DATA_URL = 'https://raw.githubusercontent.com/Alltairas/APIs/main/movie_seanses/matches.json';

  const GENRES = [
    'Musique', 'Romance', 'Animation', 'Fantastique', 'Comédie', 'Histoire', 'Drame',
    'Science-Fiction', 'Action', 'Aventure', 'Horreur', 'Guerre', 'Documentaire',
    'Policier', 'Thriller', 'Western',
  ];

  const outputEl = document.getElementById('movie-term-output');
  const inputEl = document.getElementById('movie-term-input');

  let films = [];
  let loadError = null;
  let filters = { genres: [], language: null, format: null };

  const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function fmtShowtime(st) {
    const d = new Date(st.startDate);
    const when = DAYS[(d.getDay() + 6) % 7] + ' ' +
      String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const lang = st.language === 'fr' ? 'VF' : 'VOST';
    const extras = [lang];
    if (st.format) extras.push(st.format);
    const label = when + ' · ' + extras.join(' · ');
    return st.ticketUrl
      ? '<a href="' + esc(st.ticketUrl) + '" target="_blank">' + esc(label) + '</a>'
      : esc(label);
  }

  function filmMatches(film) {
    if (filters.genres.length) {
      const has = (film.genres || []).some((g) => filters.genres.includes(g));
      if (!has) return false;
    }
    if (filters.language || filters.format) {
      const okShowtimes = (film.cinemas || []).some((c) =>
        (c.showtimes || []).some((st) => {
          if (filters.language) {
            const lang = st.language === 'fr' ? 'VF' : 'VOST';
            if (lang !== filters.language) return false;
          }
          if (filters.format && st.format !== filters.format) return false;
          return true;
        })
      );
      if (!okShowtimes) return false;
    }
    return true;
  }

  function renderResults() {
    if (loadError) {
      print('<span class="term-error">' + esc(loadError) + '</span>');
      return;
    }
    const matches = films.filter(filmMatches);
    if (!matches.length) {
      print('<span class="term-dim">No films match the current filters.</span>');
      return;
    }
    const lines = [];
    lines.push('<span class="term-dim">' + matches.length + ' film(s)</span>');
    matches.forEach((film) => {
      lines.push('');
      lines.push('<span class="term-title">' + esc(film.title) + '</span>' +
        (film.url ? ' <a href="' + esc(film.url) + '" target="_blank">↗</a>' : ''));
      lines.push('<span class="term-genre">' + esc((film.genres || []).join(', ')) + '</span>');
      (film.cinemas || []).forEach((cinema) => {
        lines.push('  ' + esc(cinema.name) + (cinema.url ? ' (' + esc(cinema.url) + ')' : ''));
        (cinema.showtimes || []).forEach((st) => {
          lines.push('    - ' + fmtShowtime(st));
        });
      });
    });
    print(lines.join('\n'));
  }

  function print(html) {
    const line = document.createElement('div');
    line.innerHTML = html;
    outputEl.appendChild(line);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function clearOutput() {
    outputEl.innerHTML = '';
  }

  function printHelp() {
    print(
      '<span class="term-dim">Commands (mirrors the scraper.py / run.sh CLI):</span>\n' +
      '  -g, --genres GENRE [GENRE ...]   filter by one or more genres (OR)\n' +
      '  -l, --language VF|VOST           filter by language\n' +
      '  -f, --format 3D|IMAX             filter by format\n' +
      '  all                              clear all filters, show everything\n' +
      '  clear                            clear this screen\n' +
      '  help                             this message\n\n' +
      '<span class="term-dim">Genres:</span> ' + GENRES.join(', ')
    );
  }

  function handleCommand(raw) {
    const line = raw.trim();
    if (!line) return;
    print('<span class="term-prompt">film@strasbourg:~$</span> ' + esc(line));

    if (line === 'help' || line === '-h' || line === '--help') return printHelp();
    if (line === 'clear') return clearOutput();
    if (line === 'all' || line === '--all') {
      filters = { genres: [], language: null, format: null };
      return renderResults();
    }

    // tokenize respecting simple quoting for multi-word genres if ever needed
    const tokens = line.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const next = { genres: [], language: null, format: null };
    let i = 0;
    let sawFlag = false;
    while (i < tokens.length) {
      const t = tokens[i];
      if (t === '-g' || t === '--genres') {
        sawFlag = true;
        i++;
        while (i < tokens.length && !tokens[i].startsWith('-')) {
          const g = tokens[i].replace(/"/g, '');
          const match = GENRES.find((x) => x.toLowerCase() === g.toLowerCase());
          if (match) next.genres.push(match);
          else print('<span class="term-error">Unknown genre: ' + esc(g) + '</span>');
          i++;
        }
      } else if (t === '-l' || t === '--language') {
        sawFlag = true;
        const v = (tokens[i + 1] || '').toUpperCase();
        if (v === 'VF' || v === 'VOST') next.language = v;
        else print('<span class="term-error">--language expects VF or VOST</span>');
        i += 2;
      } else if (t === '-f' || t === '--format') {
        sawFlag = true;
        const v = (tokens[i + 1] || '').toUpperCase();
        if (v === '3D' || v === 'IMAX') next.format = v;
        else print('<span class="term-error">--format expects 3D or IMAX</span>');
        i += 2;
      } else if (t === '--print' || t === '--notify') {
        i++; // accepted for muscle-memory parity with run.sh, no-op here
      } else {
        print('<span class="term-error">Unrecognised argument: ' + esc(t) + ' (try \'help\')</span>');
        i++;
      }
    }
    if (sawFlag) {
      filters = next;
      renderResults();
    }
  }

  async function init() {
    clearOutput();
    print('<span class="term-dim">Loading today\'s showtimes…</span>');
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      films = await res.json();
      clearOutput();
      print(
        '<span class="term-dim">Loaded ' + films.length + ' film(s) for today. Type \'help\' for commands.</span>'
      );
    } catch (e) {
      loadError = "Couldn't load today's showtime feed (" + e.message + "). " +
        'The scheduled scrape may not have published data yet — see the project on GitHub.';
      clearOutput();
      print('<span class="term-error">' + esc(loadError) + '</span>');
    }
  }

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = inputEl.value;
      inputEl.value = '';
      handleCommand(v);
    }
  });

  init();
})();
