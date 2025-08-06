'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Command } from 'lucide-react';
import SearchInterface from './SearchInterface';

interface SearchTriggerProps {
  variant?: 'button' | 'input' | 'minimal';
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function SearchTrigger({ 
  variant = 'input', 
  placeholder = 'Search everything...', 
  size = 'md',
  className = ''
}: SearchTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
      }
      
      // ESC to close
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 text-sm';
      case 'lg':
        return 'h-12 text-lg';
      default:
        return 'h-10';
    }
  };

  if (variant === 'button') {
    return (
      <>
        <Button
          variant="outline"
          onClick={handleOpen}
          className={`${getSizeClasses()} ${className} flex items-center space-x-2`}
        >
          <Search className="h-4 w-4" />
          <span>{placeholder}</span>
          <div className="ml-auto flex items-center space-x-1 text-xs text-gray-500">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </Button>
        
        <SearchInterface 
          isOpen={isOpen} 
          onClose={handleClose} 
          initialQuery={query}
        />
      </>
    );
  }

  if (variant === 'minimal') {
    return (
      <>
        <button
          onClick={handleOpen}
          className={`${className} flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors`}
          title="Search (⌘K)"
        >
          <Search className="h-5 w-5 text-gray-600" />
        </button>
        
        <SearchInterface 
          isOpen={isOpen} 
          onClose={handleClose} 
          initialQuery={query}
        />
      </>
    );
  }

  // Default: input variant
  return (
    <>
      <div className={`relative ${className}`}>
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleOpen}
          readOnly
          className={`${getSizeClasses()} pl-10 pr-16 cursor-pointer`}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 text-xs text-gray-500">
          <Command className="h-3 w-3" />
          <span>K</span>
        </div>
      </div>
      
      <SearchInterface 
        isOpen={isOpen} 
        onClose={handleClose} 
        initialQuery={query}
      />
    </>
  );
}