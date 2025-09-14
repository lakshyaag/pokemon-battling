import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <h1>Pokemon Battle Application</h1>
      <p>Welcome to the Pokemon Battle multiplayer application!</p>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          Test Counter: {count}
        </button>
        <p>
          This is a placeholder. The full battle UI will be implemented here.
        </p>
      </div>
    </div>
  );
}

export default App;