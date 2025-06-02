import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';

interface JoinFormProps {
  onJoin: (name: string) => void;
  isConnecting: boolean;
  error: string | null;
}

const JoinForm: React.FC<JoinFormProps> = ({ onJoin, isConnecting, error }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim());
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-gray-800/50 backdrop-blur-md rounded-xl shadow-2xl">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-4">
          <Volume2 size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-semibold text-white">Voiceflow</h1>
        <p className="text-gray-300 mt-2 text-center">
          Audio-only meetings with natural conversation flow
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
            Your Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-gray-400"
            required
          />
        </div>
        
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-800 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={isConnecting || !name.trim()}
          className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? 'Joining...' : 'Join Room'}
        </button>
      </form>
      
      <p className="mt-6 text-xs text-center text-gray-400">
        By joining, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
};

export default JoinForm;