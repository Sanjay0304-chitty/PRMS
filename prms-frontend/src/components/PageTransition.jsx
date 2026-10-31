import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import './PageTransition.css'

function PageTransition({ children }) {
  const location = useLocation()

  return (
    <motion.div
      key={location.pathname}
      className="page-transition"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.18,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  )
}

export default PageTransition