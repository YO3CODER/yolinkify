import { SocialLink } from '@prisma/client'
import { ChartColumnIncreasing, Pencil, Trash } from 'lucide-react'
import Link from 'next/link'
import React, { FC, useEffect, useState } from 'react'
import { SocialIcon } from 'react-social-icons'
import { incrementClickCount, toggleSocialLinkActive, updateSocialdLink } from '../server'
import toast from 'react-hot-toast'
import socialLinksData from '../socialLinksData'

interface LinkComponentProps {
  socialLink: SocialLink
  onRemove?: (id: string) => void
  readonly?: boolean
  fetchLinks?: () => void
}

/* ------------------ COULEURS ------------------ */
const couleurs = [
  'text-red-500',
  'text-blue-500',
  'text-green-500',
  'text-yellow-500',
  'text-purple-500',
]

/* ------------------ UTILITAIRE ------------------ */
const truncateLink = (url: string, maxLength = 20) => {
  return url.length > maxLength
    ? url.substring(0, maxLength) + '...'
    : url
}

/* ------------------ COMPOSANT ------------------ */
const LinkComponent: FC<LinkComponentProps> = ({
  socialLink,
  onRemove,
  readonly,
  fetchLinks,
}) => {
  const [isActive, setIsActive] = useState(socialLink.active)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    title: socialLink.title,
    url: socialLink.url,
    pseudo: socialLink.pseudo,
  })

  const [clicks , setClicks] = useState(socialLink.clicks || 0 )

  // 🎨 couleur dynamique
  const [indexCouleur, setIndexCouleur] = useState(0)

  // ⏱ changement toutes les 5 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setIndexCouleur((prev) => (prev + 1) % couleurs.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleUpdatedLink = async () => {
    try {
      const selectedTitle = socialLinksData.find(
        (l) => l.name === formData.title
      )

      if (selectedTitle?.root && selectedTitle.altRoot) {
        if (
          !formData.url.startsWith(selectedTitle.root) &&
          !formData.url.startsWith(selectedTitle.altRoot)
        ) {
          toast.error(
            `L'URL doit commencer par ${selectedTitle.root} ou par ${selectedTitle.altRoot}`
          )
          return
        }
      }

      await updateSocialdLink(socialLink.id, formData)
      setIsEditing(false)
      fetchLinks?.()
      toast.success("C'est mis à jour")
    } catch (error) {
      console.error(error)
    }
  }

  const handleIncrementClick = async() => {
    try {
      await incrementClickCount(socialLink.id)
      setClicks(clicks + 1)
    } catch (error){
      console.error(error)
    }
  }

  const handleToggleActive = async () => {
    try {
      await toggleSocialLinkActive(socialLink.id)
      setIsActive(!isActive)
      fetchLinks?.()
      toast.success("C'est fait 🤩")
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div>
      {readonly ? (
        <div className='flex flex-col bg-base-200 p-6 rounded-3xl w-full'>
        <span className='badge mb-2 '>@{socialLink.pseudo}</span>
          <div className='flex justify-between gap-2'>
            <div  className='flex items-center gap-2'> 
              <SocialIcon
                    
                    url={socialLink.url}
                    style={{ width: 30, height: 30 }}
                    onClick={handleIncrementClick}
                  />
                    <span
  className={`badge badge-outline text-xs px-2 py-1 transition-colors duration-200  ${couleurs[indexCouleur]}`}
>
  {socialLink.title}
</span>

            </div> 
            <Link className='btn btn-sm btn-accent'
             href={socialLink.url} 
             target='_blank'
             rel="noopener noreferrer"
             onClick={async () => {
               await handleIncrementClick()
               window.location.reload()
             }} 
             >
              Ouvrir le lien
              
            </Link>
         </div>
        </div>
      ) : (
        <div className="flex flex-col w-full bg-base-200 p-6 rounded-3xl gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span
              className={`badge badge-outline transition-colors duration-500 ${couleurs[indexCouleur]}`}
            >
              @{socialLink.pseudo}
            </span>

            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={isActive}
              onChange={handleToggleActive}
            />
          </div>

          {isEditing ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="select select-bordered"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                >
                  {socialLinksData.map(({ name }) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Entrez le pseudo social"
                  className="input input-bordered w-full"
                  value={formData.pseudo}
                  onChange={(e) =>
                    setFormData({ ...formData, pseudo: e.target.value })
                  }
                />

                <input
                  type="text"
                  placeholder="Entrez l'URL"
                  className="input input-bordered w-full"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                />

                <div className="flex space-x-2">
                  <button
                    className="btn btn-success"
                    onClick={handleUpdatedLink}
                  >
                    Sauvegarder
                  </button>

                  <button
                    className="btn btn-accent"
                    onClick={() => setIsEditing(false)}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Réseau social */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <SocialIcon
                    url={socialLink.url}
                    style={{ width: 30, height: 30 }}
                  />

                  <span className="badge badge-primary">
                    {socialLink.title}
                  </span>
                </div>

                <div className="flex">
                  <Link
                    href={socialLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link md:hidden"
                  >
                    {truncateLink(socialLink.url)}
                  </Link>

                  <Link
                    href={socialLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link hidden md:flex"
                  >
                    {socialLink.url}
                  </Link>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-base-300">
                <div className="flex items-center text-sm opacity-70">
                  <ChartColumnIncreasing
                    className="w-4 h-4"
                    strokeWidth={1}
                  />
                  <span
  key={clicks}
  className="ml-2 inline-flex items-center gap-1 font-semibold
             animate-pulse"
>
  🔥 {clicks} <b
  className="inline-flex items-center gap-1
             text-[11px] uppercase tracking-wider
             transition-all duration-200
             hover:scale-105 hover:opacity-100 opacity-80"
>
 clicks
</b>

</span>

                </div>

                <div className="flex gap-2">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="w-4 h-4" strokeWidth={1} />
                  </button>

                  <button className="btn btn-sm btn-secondary"
                  onClick={()=> onRemove?.(socialLink.id)}
                  >
                    <Trash className="w-4 h-4" strokeWidth={1} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default LinkComponent