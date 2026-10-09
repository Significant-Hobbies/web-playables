import React, { useEffect, useState } from 'react';

import { authClient } from '@/lib/auth-client';
import { localListSavedGames, uploadLocalSavesToCloud } from '@/lib/game-storage';

const UPLOAD_PROMPTED_KEY = 'oh_upload_prompted';

interface UserMenuProps {
  user: { name: string; email: string };
  onRefreshSaves?: () => void;
}

export default function UserMenu({ user, onRefreshSaves }: UserMenuProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [showUploadPrompt, setShowUploadPrompt] = useState(false);

  useEffect(() => {
    const alreadyPrompted = localStorage.getItem(UPLOAD_PROMPTED_KEY);
    if (alreadyPrompted) return;
    const localSaves = localListSavedGames();
    if (localSaves.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowUploadPrompt(true);
    }
  }, []);

  const handleUpload = async () => {
    setShowUploadPrompt(false);
    localStorage.setItem(UPLOAD_PROMPTED_KEY, '1');

    const localSaves = localListSavedGames();
    if (localSaves.length === 0) {
      setUploadResult('No local saves to upload.');
      setTimeout(() => setUploadResult(null), 3000);
      return;
    }

    setUploading(true);
    try {
      const count = await uploadLocalSavesToCloud();
      setUploadResult(`Uploaded ${count} save${count !== 1 ? 's' : ''} to cloud.`);
      onRefreshSaves?.();
    } catch (err) {
      console.error(err);
      setUploadResult('Upload failed. Try again.');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadResult(null), 3000);
    }
  };

  const dismissPrompt = () => {
    setShowUploadPrompt(false);
    localStorage.setItem(UPLOAD_PROMPTED_KEY, '1');
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.reload();
  };

  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Upload prompt banner */}
      {showUploadPrompt && (
        <div className="bg-sky-900/50 border border-sky-700/40 rounded-xl px-3 py-2.5 text-xs text-sky-200 flex items-center gap-2 backdrop-blur-sm animate-slide-down">
          <span>Upload local saves to the cloud?</span>
          <button
            type="button"
            onClick={handleUpload}
            className="bg-sky-600/80 hover:bg-sky-500 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] uppercase transition-colors"
          >
            Upload
          </button>
          <button
            type="button"
            onClick={dismissPrompt}
            className="text-sky-400/70 hover:text-sky-300 text-[11px] transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-amber-900/40 border border-amber-700/30 flex items-center justify-center text-[11px] font-bold text-amber-400 shrink-0">
          {initial}
        </div>
        <span className="text-xs text-slate-500 hidden sm:inline max-w-[120px] truncate">
          {user.name || user.email}
        </span>
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="text-[11px] uppercase bg-sky-800/50 hover:bg-sky-700/60 disabled:opacity-50 text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors border border-sky-700/30"
          title="Upload local saves to cloud"
        >
          {uploading ? 'Uploading...' : 'Upload Saves'}
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-[11px] uppercase bg-slate-800/50 hover:bg-slate-700/60 text-slate-300 font-bold px-2.5 py-1.5 rounded-lg transition-colors border border-slate-700/30"
        >
          Sign Out
        </button>
        {uploadResult && (
          <span className="text-[11px] text-emerald-400 animate-fade-in">{uploadResult}</span>
        )}
      </div>
    </div>
  );
}
