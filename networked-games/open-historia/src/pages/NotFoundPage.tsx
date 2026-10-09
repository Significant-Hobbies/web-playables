import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-100 font-mono p-8">
      <div className="text-center max-w-md">
        <p className="text-sm font-bold tracking-[0.3em] text-slate-600 mb-2">404</p>
        <h2 className="text-2xl font-serif font-bold text-amber-500 mb-4">Lost to history</h2>
        <p className="text-sm text-slate-400 mb-6">
          This page doesn&apos;t exist or has been swept away by the tides of time.
        </p>
        <Link
          to="/"
          className="inline-block bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
