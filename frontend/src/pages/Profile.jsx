import React, { useState } from 'react';
import { User, ShieldCheck, Flame, Film, Clock, Settings, Sparkles, KeyRound, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();

  // Profile Edit State
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Playback Preferences
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [preferredAudio, setPreferredAudio] = useState('Sub');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ type: '', text: '' });

    try {
      await updateProfile({ username, avatar_url: avatarUrl });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMsg({ type: '', text: '' });

    try {
      await authAPI.changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060709] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Profile Card Header */}
      <div className="bg-[#0F1115] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-2xl relative overflow-hidden">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#1E2028] border-2 border-white/20 p-1 flex-none shadow-xl overflow-hidden">
          <div className="w-full h-full bg-[#0F1115] rounded-full flex items-center justify-center text-white overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-black uppercase text-[#E2E8F0]">{user?.username?.[0] || 'U'}</span>
            )}
          </div>
        </div>

        <div className="space-y-2 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white">{user?.username || 'OmniFlex Member'}</h1>
            <span className="flex items-center gap-1 bg-white/10 text-gray-200 border border-white/20 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              <Sparkles className="w-3 h-3" /> {user?.role === 'admin' ? 'Administrator' : 'VIP Member'}
            </span>
          </div>
          <p className="text-xs text-[#94A3B8]">{user?.email}</p>
        </div>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#16181F] p-5 rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 text-[#E2E8F0] flex items-center justify-center">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-white">42</span>
            <p className="text-xs text-[#94A3B8]">Anime Completed</p>
          </div>
        </div>

        <div className="bg-[#16181F] p-5 rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-white">528</span>
            <p className="text-xs text-[#94A3B8]">Episodes Watched</p>
          </div>
        </div>

        <div className="bg-[#16181F] p-5 rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-white">214h</span>
            <p className="text-xs text-[#94A3B8]">Hours Streamed</p>
          </div>
        </div>
      </div>

      {/* Account Settings Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Edit Profile */}
        <div className="bg-[#0F1115] p-6 rounded-3xl border border-white/10 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-[#94A3B8]" />
            <span>Update Profile</span>
          </h2>

          {profileMsg.text && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              profileMsg.type === 'success' ? 'bg-green-950/60 text-green-200 border border-green-800' : 'bg-red-950/60 text-red-200 border border-red-800'
            }`}>
              {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
            <div>
              <label className="block text-[#94A3B8] font-semibold mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#16181F] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#E2E8F0]"
              />
            </div>

            <div>
              <label className="block text-[#94A3B8] font-semibold mb-1">Avatar Image URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full bg-[#16181F] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#E2E8F0]"
              />
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="w-full py-2.5 bg-[#E2E8F0] hover:bg-white text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-[#0F1115] p-6 rounded-3xl border border-white/10 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#94A3B8]" />
            <span>Change Password</span>
          </h2>

          {passwordMsg.text && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              passwordMsg.type === 'success' ? 'bg-green-950/60 text-green-200 border border-green-800' : 'bg-red-950/60 text-red-200 border border-red-800'
            }`}>
              {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block text-[#94A3B8] font-semibold mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#16181F] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#E2E8F0]"
              />
            </div>

            <div>
              <label className="block text-[#94A3B8] font-semibold mb-1">New Password (min 6 chars)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#16181F] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#E2E8F0]"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-2.5 bg-[#E2E8F0] hover:bg-white text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Playback Preferences */}
      <div className="bg-[#111018] p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/10 pb-4">
          <Settings className="w-5 h-5 text-[#94A3B8]" />
          <h2 className="text-base font-bold text-white">Playback Preferences</h2>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white">Autoplay Next Episode</h4>
              <p className="text-[#94A3B8]">Transition to next episode automatically</p>
            </div>
            <button
              onClick={() => setAutoplayNext(!autoplayNext)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                autoplayNext ? 'bg-[#E2E8F0]' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  autoplayNext ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h4 className="text-sm font-semibold text-white">Default Audio Language</h4>
              <p className="text-[#94A3B8]">Preferred voice track</p>
            </div>
            <div className="flex items-center gap-2">
              {['Sub (Original Japanese)', 'Dub (English)'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPreferredAudio(opt)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${
                    preferredAudio === opt
                      ? 'bg-[#E2E8F0] border-[#E2E8F0] text-black font-bold shadow-sm'
                      : 'bg-[#16181F] border-white/10 text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
