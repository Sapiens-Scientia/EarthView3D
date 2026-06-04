import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import App from './App'
import { AppProvider } from './contexts'

const rootElement = document.getElementById('root')

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </React.StrictMode>
  )
}
