export function Footer() {
  return (
    <footer className="bg-background text-foreground mt-auto">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-4 text-xs md:px-15">
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
