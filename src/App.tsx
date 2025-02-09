import React from 'react';
import './App.css';
import WebGLShaderEditor from './components/WebGLShaderEditor';

function App() {
  return (
    <div className="App relative w-full h-full bg-black">
      <WebGLShaderEditor />
    </div>
  );
}

export default App;
