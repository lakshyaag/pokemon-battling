'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import BattleComponent from '../components/BattleComponent';
import Link from 'next/link';

/**
 * Battle page component
 */
export default function BattlePage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get parameters from URL
  const format = searchParams.get('format') || 'gen3randombattle';
  const p1Name = searchParams.get('p1Name') || 'Player 1';
  const p2Name = searchParams.get('p2Name') || 'Player 2';
  const p1Team = searchParams.get('p1Team') || undefined;
  const p2Team = searchParams.get('p2Team') || undefined;
  
  useEffect(() => {
    // Validate parameters
    if (!format) {
      setError('No battle format specified');
      setIsLoading(false);
      return;
    }
    
    // If we have all required parameters, we can start the battle
    setIsLoading(false);
  }, [format]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Battle...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-500 mb-6">{error}</p>
          <Link 
            href="/"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex justify-between items-center">
        <Link 
          href="/"
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
        >
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold text-center">Pokémon Battle</h1>
        
        <div className="w-[100px]"></div> {/* Spacer for alignment */}
      </div>
      
      <BattleComponent
        format={format}
        p1Name={p1Name}
        p2Name={p2Name}
        p1Team={p1Team}
        p2Team={p2Team}
      />
    </div>
  );
} 