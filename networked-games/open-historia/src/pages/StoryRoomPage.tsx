import { Link } from 'react-router-dom';

import StoryRoomPrototype from '@/components/StoryRoomPrototype';

export default function StoryRoomPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200">
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-12">
        <div className="mb-4 flex items-center justify-between text-xs">
          <Link
            to="/play"
            className="text-amber-400 hover:text-amber-300 underline decoration-dotted"
          >
            ← back to the game
          </Link>
          <div className="text-slate-600">open-historia • story room v0</div>
          <Link to="/about" className="text-slate-400 hover:text-slate-300">
            about
          </Link>
        </div>

        <StoryRoomPrototype />

        <div className="mt-8 border-t border-slate-800 pt-6 text-[11px] text-slate-500 max-w-prose">
          <p>
            StoryTunes prototype: submit/vote/canon, multi-round canon, branch archive with replay
            and revive, and fixture-only AI co-author suggestions — isolated from strategy-game
            state and saves.
          </p>
          <p className="mt-2">
            Read the full product brief: <span className="text-amber-400">STORY-ROOMS.md</span>{' '}
            (open the file in the repo root).
          </p>
        </div>
      </div>
    </div>
  );
}
