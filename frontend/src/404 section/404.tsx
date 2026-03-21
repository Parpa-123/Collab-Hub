import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex bg-background min-h-[calc(100vh-4rem)] flex-col items-center justify-center text-center px-4">
      <div className="space-y-6 max-w-md">
        <div className="relative">
          <h1 className="text-9xl font-extrabold text-primary/10 tracking-widest drop-shadow-sm">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-semibold tracking-wider uppercase -rotate-6 shadow-lg">
              Page Not Found
            </span>
          </div>
        </div>
        
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Oops! You're lost.
        </h2>
        
        <p className="text-muted-foreground text-lg">
          We can't seem to find the page you're looking for. It might have been removed or doesn't exist.
        </p>

        <div className="pt-6 border-t border-border mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
