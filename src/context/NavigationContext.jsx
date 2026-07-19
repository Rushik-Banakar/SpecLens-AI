import React, { createContext, useContext } from 'react';

const NavigationContext = createContext(null);

export function NavigationProvider({ goHome, children }) {
  return (
    <NavigationContext.Provider value={{ goHome }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
