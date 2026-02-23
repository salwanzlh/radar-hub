import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-surface-200 mb-4 tracking-tight">404</h1>
        <h2 className="text-lg font-semibold text-text-primary mb-2">Page Not Found</h2>
        <p className="text-sm text-text-secondary mb-6">
          The page you are looking for does not exist.
        </p>
        <Link
          to="/"
          className="px-6 py-2.5 bg-brand-accent text-text-primary text-sm font-medium rounded-xl hover:bg-brand-accent-hover transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
