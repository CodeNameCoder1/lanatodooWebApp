import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Todos from './pages/Todos';
import Budget from './pages/Budget';
import Planner from './pages/Planner';
import Goals from './pages/Goals';
import Notes from './pages/Notes';
import Navigation from './components/Navigation';
import { ViewState } from './types';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  
  // Fake refresh trigger to update dashboard when navigating back
  const [refreshKey, setRefreshKey] = useState(0); 

  const handleSetView = (view: ViewState) => {
    setCurrentView(view);
    if (view === 'dashboard') {
      setRefreshKey(prev => prev + 1);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard refreshData={() => setRefreshKey(prev => prev + 1)} key={refreshKey} />;
      case 'todos': return <Todos />;
      case 'budget': return <Budget />;
      case 'planner': return <Planner />;
      case 'goals': return <Goals />;
      case 'notes': return <Notes />;
      default: return <Dashboard refreshData={() => {}} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-primary font-sans">
      <main className="max-w-md mx-auto p-5 min-h-screen relative">
        {renderView()}
      </main>
      <Navigation currentView={currentView} setView={handleSetView} />
    </div>
  );
}

export default App;