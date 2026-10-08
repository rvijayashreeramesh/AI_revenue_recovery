import React from 'react';
import { SocketProvider } from './context/SocketContext';
import Dashboard from './components/Dashboard';

export function App() {
  return (
    <SocketProvider>
      <Dashboard />
    </SocketProvider>
  );
}

export default App;
