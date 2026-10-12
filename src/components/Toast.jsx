import { useEffect, useState } from 'react'
import './Toast.css'

export default function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 400)
    }, 3000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`toast ${visible ? 'toast-in' : 'toast-out'}`}>
      {message}
    </div>
  )
}
