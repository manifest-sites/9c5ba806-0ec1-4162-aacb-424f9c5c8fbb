import React from 'react'
import { Link, useLocation } from 'react-router-dom'

function Navigation() {
  const location = useLocation()

  const handleLogout = async () => {
    try {
      await fetch('https://db.madewithmanifest.com/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      // Refresh page to trigger re-authentication check
      window.location.reload()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }
  
  return (
    <nav className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center">
          <div className="flex space-x-8">
            <Link 
              to="/" 
              className={`py-4 px-6 border-b-2 transition-colors ${
                location.pathname === '/' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
              }`}
            >
              Flash Cards
            </Link>
            <Link 
              to="/about" 
              className={`py-4 px-6 border-b-2 transition-colors ${
                location.pathname === '/about' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
              }`}
            >
              About
            </Link>
          </div>
          
          <div className="py-4">
            <button 
              onClick={handleLogout}
              className="py-2 px-4 text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation