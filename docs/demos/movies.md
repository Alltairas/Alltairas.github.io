# Strasbourg Movie Showtimes

A browser-hosted, terminal-style front end for [movie_seanses](https://github.com/Alltairas/APIs/tree/main/movie_seanses){: target="_blank" },
a scraper that pulls today's showtimes from the 5 Strasbourg cinemas on [timepilot.co](https://timepilot.co/cinemas/strasbourg){: target="_blank" }.
The original project talks to Telegram; this page reads the same command syntax as its `run.sh` CLI, but the
result prints right here instead of going out over a bot.

<div id="movie-term" class="term-box">
  <div id="movie-term-output" class="term-output">Connecting to showtime feed…</div>
  <div class="term-inputline">
    <span class="term-prompt">film@strasbourg:~$</span>
    <input id="movie-term-input" class="term-input" type="text" autocomplete="off" spellcheck="false"
           placeholder="type 'help' to get started" />
  </div>
</div>

Try `-g Science-Fiction Action`, `-l VOST`, `-f IMAX`, or combine them: `-g Comédie -l VF`. Type `help` for the
full command reference, `all` to clear filters.

Showtimes only ever cover **today** (that's a limit of the source site, not this page), refreshed a few times a
day by a scheduled scrape, not scraped live from your browser. If the feed below says it can't connect, the
scheduled job likely hasn't published data yet.
