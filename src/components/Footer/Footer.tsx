export function Footer() {
  return (
    <footer className="bg-background text-foreground mt-auto">
      <div className="text-[10px] container-shell flex items-center justify-center pb-2 md:py-4 md:text-xs">
        <p className="text-foreground/60">
          Show data provided by{' '}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/80 hover:text-foreground font-semibold transition-colors"
          >
            The Movie Database (TMDB)
          </a>
        </p>
      </div>
    </footer>
  );
}
