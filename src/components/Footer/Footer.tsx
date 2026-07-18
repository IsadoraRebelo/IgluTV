export function Footer() {
  return (
    <footer className="bg-background text-foreground mt-auto">
      <div className="container-shell flex items-center justify-center py-4 text-xs">
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
