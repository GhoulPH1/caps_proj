import { Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import Dashboard from './pages/Dashboard'

function App() {
 
  return (
    <>
    <Routes>  
      <Route path="/login" element = { <LoginPage/> } />
      <Route path="/register" element = { <RegisterPage/> } />
      <Route path="/" element = { <HomePage/> } />
      <Route path="/dashboard" element = { <Dashboard/> } />
    </Routes>  
    </>
  )
}

export default App
