import React from 'react';
import { useNavigation } from '../context/NavigationContext';

export default function AppLogo({
  onClick,
  className = '',
  textClassName = 'font-semibold text-lg tracking-tight text-white',
  showIcon = true,
}) {
  const { goHome } = useNavigation();

  const handleClick = (event) => {
    goHome();
    onClick?.(event);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2.5 cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 focus-visible:outline-offset-2 ${className}`}
      aria-label="Go to Home"
    >
      {showIcon && (
        <span
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20 ring-1 ring-white/10"
          aria-hidden="true"
        >
          S
        </span>
      )}
      <span className={textClassName}>
        SpecLens <span className="text-indigo-400">AI</span>
      </span>
    </button>
  );
}
