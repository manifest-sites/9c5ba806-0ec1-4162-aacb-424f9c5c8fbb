import { useState, useEffect } from 'react'
import Loading from './Loading'
import LoginRequired from './LoginRequired'
import PaymentRequired from './PaymentRequired'
import SubscriptionRequired from './SubscriptionRequired'
import manifestConfig from '../../../manifest.config.json'

function Monetization({ children }) {
  const [isLoading, setIsLoading] = useState(true)
  const [state, setState] = useState('open') // 'open', 'login_required', 'payment_required', 'subscription_required'
  const [config, setConfig] = useState(null)
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false)

  useEffect(() => {
    const checkUserLogin = async () => {
      try {
        const userResponse = await fetch('https://db.madewithmanifest.com/auth/user', {
          credentials: 'include'
        })
        
        if (userResponse.ok) {
          const userData = await userResponse.json()
          if (userData.appId === manifestConfig.appId) {
            setIsUserLoggedIn(true)
          } else {
            setIsUserLoggedIn(false)
          }
        } else {
          setIsUserLoggedIn(false)
        }
      } catch (error) {
        console.error('Error checking user login status:', error)
        setIsUserLoggedIn(false)
      }
    }

    const fetchConfig = async () => {
      try {
        const response = await fetch(`https://db.madewithmanifest.com/${manifestConfig.appId}/config`, {
          credentials: 'include'
        })
        const configData = await response.json()
        
        console.log('config.monetization.type', configData.monetization?.type)
        
        setConfig(configData)
        setState(configData.monetization?.type || 'open')
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching config:', error)
        // Fallback to open state if config fetch fails
        setState('open')
        setIsLoading(false)
      }
    }

    const initializeComponent = async () => {
      await checkUserLogin()
      await fetchConfig()
    }

    // Listen for authentication events from popup
    const handleAuthMessage = (event) => {
      if (event.origin !== window.location.origin) return
      
      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        // Re-check user login status when popup auth succeeds
        checkUserLogin()
      }
    }

    window.addEventListener('message', handleAuthMessage)
    initializeComponent()

    // Cleanup event listener
    return () => {
      window.removeEventListener('message', handleAuthMessage)
    }
  }, [])

  if (isLoading) {
    return <Loading />
  }

  // Handle different states
  switch (state) {
    case 'login_required':
      // If user is already logged in, show children; otherwise show login required
      return isUserLoggedIn ? <>{children}</> : <LoginRequired />

    case 'payment_required':
      return <PaymentRequired />

    case 'subscription_required':
      return <SubscriptionRequired />

    case 'open':
    default:
      // Show the original content
      return <>{children}</>
  }
}

export default Monetization 