'use client'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

export default function TestPage() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-10 flex items-center gap-4"
        >
            <CheckCircle className="text-green-500 w-10 h-10" />
            <h1 className="text-3xl font-bold">Modules are working!</h1>
        </motion.div>
    )
}
