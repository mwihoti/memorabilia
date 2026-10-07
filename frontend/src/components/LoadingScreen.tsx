export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4 animate-bounce">🎮</div>
          <h1 className="text-4xl font-bold gradient-text mb-2">Memorabilia</h1>
          <p className="text-gray-400">The Time-Travel Museum Game</p>
        </div>
        
        <div className="flex items-center justify-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        
        <p className="mt-4 text-sm text-gray-500">Opening the museum…</p>
      </div>
    </div>
  );
}

