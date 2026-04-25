import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import PollDetail from './pages/PollDetail'
import CreatePoll from './pages/CreatePoll'

function App() {
  return (
    <div className="app">
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/poll/:id" element={<PollDetail />} />
          <Route path="/create" element={<CreatePoll />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
