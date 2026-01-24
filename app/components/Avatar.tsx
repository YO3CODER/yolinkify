'use client' // Ajouté explicitement (bonne pratique pour un composant avec useState/useEffect)

import React, { useEffect, useState } from 'react'

interface AvatarProps {
  pseudo: string
}

const couleurs = [
  'from-pink-500 via-purple-500 to-indigo-500',
  'from-green-400 via-emerald-500 to-teal-500',
  'from-yellow-400 via-orange-500 to-red-500',
  'from-cyan-400 via-sky-500 to-blue-600',
  'from-fuchsia-500 via-rose-500 to-red-500',
]

const Avatar: React.FC<AvatarProps> = ({ pseudo }) => {
  const avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${pseudo || 'anonymous'}`
  
  const [indexCouleur, setIndexCouleur] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndexCouleur((prev) => (prev + 1) % couleurs.length)
    }, 8000) // ← augmenté à 8s pour réduire les re-renders inutiles

    return () => clearInterval(interval)
  }, []) // Pas de dépendance sur pseudo → stable

  // Protection : pseudo toujours string valide
  const safePseudo = pseudo?.trim() || 'utilisateur'

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-24 rounded-full p-1 transition-all duration-1000 ease-in-out"
        style={{
          backgroundImage: `linear-gradient(to right, ${couleurs[indexCouleur]})`,
        }}
      >
        <div className="rounded-full bg-base-100 overflow-hidden">
          <img
            src={avatarUrl}
            alt={`Avatar de ${safePseudo}`}
            className="w-full h-full object-cover"
            width={96}
            height={96}
          />
        </div>
      </div>

      {/* Séparation des nœuds texte + clé stable → évite les bugs de text node splitting */}
      <p 
        key={`pseudo-${safePseudo}`} 
        className="font-semibold text-center text-base"
      >
        <span className="text-primary">@{safePseudo}</span>
        <span className="text-orange-500 font-bold ml-1">🔥</span>
      </p>
    </div>
  )
}

export default Avatar