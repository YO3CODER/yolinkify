"use client";
import { SocialLink } from '@prisma/client'
import { ChartColumnIncreasing, Pencil, Trash, ExternalLink, Check, X, TrendingUp, FileText, Image, Upload, XCircle, Eye, EyeOff, Download, Heart } from 'lucide-react'
import Link from 'next/link'
import React, { FC, useState, useMemo, useEffect, useRef } from 'react'
import { SocialIcon } from 'react-social-icons'
import { toggleSocialLinkActive, updateSocialdLink, incrementClickCount, toggleLike, getLikesCount, hasUserLiked } from '../server'
import toast from 'react-hot-toast'
import socialLinksData from '../socialLinksData'
import { useUser } from '@clerk/nextjs'

// ----------------------------------------------------------------------------

const isYouTubeUrl = (url: string) => /youtube\.com\/watch\?v=|youtu\.be\//.test(url)

const getYouTubeEmbedUrl = (url: string) => {
  const match = url.match(/(?:v=|youtu\.be\/)([\w-]+)/)
  return match ? `https://www.youtube.com/embed/${match[1]}` : null
}

// -------------------------------------------------------------

interface LinkComponentProps {
  socialLink: SocialLink & {
    likesCount?: number
    isLikedByCurrentUser?: boolean
  }
  onRemove?: (id: string) => void
  readonly?: boolean
  fetchLinks?: () => void
  showDescription?: boolean
}

/* ------------------ COULEURS ------------------ */
const COULEURS = [
  'text-red-500 hover:text-red-600',
  'text-blue-500 hover:text-blue-600',
  'text-green-500 hover:text-green-600',
  'text-amber-500 hover:text-amber-600',
  'text-purple-500 hover:text-purple-600',
  'text-pink-500 hover:text-pink-600',
  'text-cyan-500 hover:text-cyan-600',
]

const COULEURS_BG = [
  'bg-red-500/10',
  'bg-blue-500/10',
  'bg-green-500/10',
  'bg-amber-500/10',
  'bg-purple-500/10',
  'bg-pink-500/10',
  'bg-cyan-500/10',
]

const BORDER_COULEURS = [
  'border-red-500',
  'border-blue-500',
  'border-green-500',
  'border-amber-500',
  'border-purple-500',
  'border-pink-500',
  'border-cyan-500',
]

// Couleurs par défaut pour chaque réseau social
const DEFAULT_COLORS: Record<string, string> = {
  'Twitter': '#1DA1F2',
  'X': '#000000',
  'Instagram': '#E4405F',
  'Facebook': '#1877F2',
  'LinkedIn': '#0A66C2',
  'GitHub': '#181717',
  'YouTube': '#FF0000',
  'TikTok': '#000000',
  'Discord': '#5865F2',
  'Twitch': '#9146FF',
  'Reddit': '#FF4500',
  'Pinterest': '#E60023',
  'Snapchat': '#FFFC00',
  'Spotify': '#1DB954',
  'Dribbble': '#EA4C89',
  'Behance': '#0057FF',
  'Medium': '#000000',
  'Telegram': '#26A5E4',
  'WhatsApp': '#25D366',
}

// Catégories par défaut
const DEFAULT_CATEGORIES: Record<string, string> = {
  'Twitter': 'Réseau social',
  'X': 'Réseau social',
  'Instagram': 'Réseau social',
  'Facebook': 'Réseau social',
  'LinkedIn': 'Professionnel',
  'GitHub': 'Développement',
  'YouTube': 'Vidéo',
  'TikTok': 'Vidéo',
  'Discord': 'Communication',
  'Twitch': 'Streaming',
  'Reddit': 'Communauté',
  'Pinterest': 'Créatif',
  'Snapchat': 'Social',
  'Spotify': 'Musique',
  'Dribbble': 'Design',
  'Behance': 'Design',
  'Medium': 'Blog',
  'Telegram': 'Messagerie',
  'WhatsApp': 'Messagerie',
}

/* ------------------ UTILITAIRE ------------------ */
const truncateLink = (url: string, maxLength = 30) => {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace('www.', '')
    const path = urlObj.pathname
    
    if ((hostname + path).length > maxLength) {
      return hostname + path.substring(0, maxLength - hostname.length) + '...'
    }
    return hostname + path
  } catch {
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url
  }
}

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const isImageFile = (type: string) => type.startsWith('image/')
const isPDFFile = (type: string) => type === 'application/pdf'

/* ------------------ COMPOSANT ------------------ */
const LinkComponent: FC<LinkComponentProps> = ({
  socialLink,
  onRemove,
  readonly,
  fetchLinks,
  showDescription = true,
}) => {
  const [isActive, setIsActive] = useState(socialLink.active)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [useFileUpload, setUseFileUpload] = useState(false)
  const [localShowDescription, setLocalShowDescription] = useState(showDescription)
  const [formData, setFormData] = useState({
    title: socialLink.title,
    url: socialLink.url,
    pseudo: socialLink.pseudo,
    description: socialLink.description || '',
  })
  const [clicks, setClicks] = useState(socialLink.clicks)
  const [borderColorIndex, setBorderColorIndex] = useState(0)
  
  // États pour les likes
  const [isLiked, setIsLiked] = useState(socialLink.isLikedByCurrentUser || false)
  const [likesCount, setLikesCount] = useState(socialLink.likesCount || 0)
  const [isLiking, setIsLiking] = useState(false)
  
  const { user } = useUser()
  const currentUserId = user?.id
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Synchroniser avec la prop showDescription
  useEffect(() => {
    setLocalShowDescription(showDescription)
  }, [showDescription])

  useEffect(() => {
    const interval = setInterval(() => {
      setBorderColorIndex((prev) => (prev + 1) % BORDER_COULEURS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Charger les données de likes au montage
  useEffect(() => {
    const loadLikeData = async () => {
      if (currentUserId) {
        const liked = await hasUserLiked(socialLink.id, currentUserId)
        setIsLiked(liked)
      }
      const count = await getLikesCount(socialLink.id)
      setLikesCount(count)
    }
    
    loadLikeData()
  }, [socialLink.id, currentUserId])

  // 🎨 couleur dynamique basée sur l'ID pour consistance
  const colorIndex = useMemo(() => 
    Math.abs(socialLink.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % COULEURS.length,
    [socialLink.id]
  )

  const getSocialIconStyle = useMemo(() => ({
    width: 28,
    height: 28,
    borderRadius: '50%',
    transition: 'all 0.3s ease',
  }), [])

  // Récupérer les données du réseau social
  const currentSocialData = useMemo(() => 
    socialLinksData.find(l => l.name === socialLink.title),
    [socialLink.title]
  )

  // Récupérer la couleur (depuis les données ou par défaut)
  const socialColor = useMemo(() => 
    // @ts-ignore - On ignore l'erreur si la propriété n'existe pas
    currentSocialData?.color || DEFAULT_COLORS[socialLink.title] || '#666',
    [currentSocialData, socialLink.title]
  )

  // Récupérer la catégorie (depuis les données ou par défaut)
  const socialCategory = useMemo(() => 
    // @ts-ignore - On ignore l'erreur si la propriété n'existe pas
    currentSocialData?.category || DEFAULT_CATEGORIES[socialLink.title] || 'Social',
    [currentSocialData, socialLink.title]
  )

  // Vérifier si l'URL actuelle est un fichier uploadé
  const isUploadedFile = useMemo(() => {
    return formData.url.startsWith('/uploads/') || selectedFile
  }, [formData.url, selectedFile])

  const handleToggleLike = async () => {
    if (!currentUserId) {
      toast.error('Vous devez être connecté pour liker')
      return
    }

    if (isLiking) return

    setIsLiking(true)
    try {
      const result = await toggleLike(socialLink.id, currentUserId)
      
      if (result.success) {
        setIsLiked(!isLiked)
        setLikesCount(result.likesCount || 0)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Erreur lors du like:', error)
      toast.error('Erreur lors du traitement du like')
    } finally {
      setIsLiking(false)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    // Limites de taille
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (selectedFile.size > maxSize) {
      toast.error('Le fichier est trop volumineux (max 10MB)')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('linkId', socialLink.id)

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        throw new Error('Upload échoué')
      }

      const data = await response.json()
      
      // Mettre à jour l'URL du lien avec le fichier uploadé
      const newUrl = data.url
      await updateSocialdLink(socialLink.id, {
        ...formData,
        url: newUrl,
        title: isImageFile(selectedFile.type) ? 'Image' : 'Document PDF',
      })

      setFormData(prev => ({ 
        ...prev, 
        url: newUrl,
        title: isImageFile(selectedFile.type) ? 'Image' : 'Document PDF'
      }))
      setSelectedFile(null)
      setUseFileUpload(false)
      
      // Réinitialiser le champ fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      fetchLinks?.()
      toast.success('Fichier uploadé avec succès !')
      
      // Réinitialiser la progression après 1 seconde
      setTimeout(() => setUploadProgress(0), 1000)

    } catch (error) {
      console.error('Erreur upload:', error)
      toast.error('Erreur lors de l\'upload du fichier')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Vérifier le type de fichier
    const isImage = isImageFile(file.type)
    const isPDF = isPDFFile(file.type)

    if (!isImage && !isPDF) {
      toast.error('Format de fichier non supporté. Utilisez une image ou un PDF.')
      return
    }

    setSelectedFile(file)
    setUseFileUpload(true)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setUseFileUpload(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSwitchToUrl = () => {
    setSelectedFile(null)
    setUseFileUpload(false)
    setFormData(prev => ({ ...prev, url: '' }))
  }

  const handleSwitchToFile = () => {
    setUseFileUpload(true)
    setFormData(prev => ({ ...prev, url: '' }))
  }

  const handleIncrementClick = async () => {
    try {
      await incrementClickCount(socialLink.id)
      setClicks(clicks + 1)
    } catch (error){
      console.error(error)
    }
  }

  const handleUpdatedLink = async () => {
    // Si on utilise l'upload de fichier, l'URL n'est pas requise
    if (!formData.title || !formData.pseudo) {
      toast.error('Titre et pseudo sont requis')
      return
    }

    // Si on n'utilise pas l'upload, vérifier l'URL
    if (!useFileUpload && !isValidUrl(formData.url)) {
      toast.error('URL invalide')
      return
    }

    // Validation pour les réseaux sociaux
    if (!useFileUpload && !isUploadedFile) {
      const selectedTitle = socialLinksData.find(
        (l) => l.name === formData.title
      )

      if (selectedTitle?.root && selectedTitle.altRoot) {
        if (
          !formData.url.startsWith(selectedTitle.root) &&
          !formData.url.startsWith(selectedTitle.altRoot)
        ) {
          toast.error(
            `L'URL doit commencer par ${selectedTitle.root} ou ${selectedTitle.altRoot}`
          )
          return
        }
      }
    }

    setIsLoading(true)
    try {
      await updateSocialdLink(socialLink.id, formData)
      setIsEditing(false)
      setSelectedFile(null)
      setUseFileUpload(false)
      fetchLinks?.()
      toast.success('Lien mis à jour avec succès 🎉')
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async () => {
    try {
      await toggleSocialLinkActive(socialLink.id)
      setIsActive(!isActive)
      fetchLinks?.()
      toast.success(`Lien ${!isActive ? 'activé' : 'désactivé'} 👍`)
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de la modification')
    }
  }

  const handleRemove = async () => {
    if (!onRemove || isDeleting) return
    
    // Remplacer window.confirm par un toast de confirmation
    toast((t) => (
      <div className="flex flex-col gap-4 p-2">
        <div className="font-semibold text-base">
          Êtes-vous sûr de vouloir supprimer ce lien ?
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => toast.dismiss(t.id)}
          >
            Annuler
          </button>
          <button
            className="btn btn-sm btn-error text-white"
            onClick={async () => {
              toast.dismiss(t.id);
              setIsDeleting(true);
              try {
                await onRemove(socialLink.id);
                toast.success('Lien supprimé avec succès');
              } catch (error) {
                console.error(error);
                toast.error('Erreur lors de la suppression');
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            Supprimer
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
    });
  }

  // Convertit les URLs dans le texte en liens cliquables
  const linkify = (text: string) => {
    if (!text) return null;

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.split(urlRegex).map((part, index) =>
      urlRegex.test(part) ? (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800 break-all"
        >
          {part}
        </a>
      ) : (
        part
      )
    );
  }

  return (
    <div className="group relative">
      {readonly ? (
        <div className={`flex flex-col p-4 sm:p-6 rounded-3xl w-full transition-all duration-300 overflow-hidden
          ${isActive ? 'bg-gradient-to-br from-base-200 to-base-300 shadow-lg' : 'bg-base-300/50 opacity-70'}`}>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className={`relative ${COULEURS_BG[colorIndex]} p-2 rounded-2xl`}>
                {isUploadedFile && isImageFile(socialLink.url) ? (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <Image className="w-4 h-4 text-white" />
                  </div>
                ) : isUploadedFile && isPDFFile(socialLink.url) ? (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <SocialIcon
                    url={socialLink.url}
                    style={getSocialIconStyle}
                    bgColor={socialColor}
                    className="transition-opacity hover:opacity-80"
                  />
                )}
              </div>
              <div className="flex flex-col">
                <span className={`font-bold text-sm ${COULEURS[colorIndex]} truncate`}>
                  {isUploadedFile 
                    ? (isImageFile(socialLink.url) ? 'Image' : 'Document PDF') 
                    : socialLink.title}
                </span>
                <span className="text-xs opacity-80 truncate">@{socialLink.pseudo}</span>
              </div>
            </div>
            
            {clicks > 0 && (
              <div className={`flex items-center gap-1 px-3 py-1 bg-base-300 rounded-full border-2 ${BORDER_COULEURS[borderColorIndex]} transition-colors duration-500`}>
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-bold">{clicks}</span>
                {isYouTubeUrl(socialLink.url) && (
                  <Link 
                    href={socialLink.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2"
                    onClick={isActive ? handleIncrementClick : undefined}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Aperçu pour les fichiers uploadés */}
          {isUploadedFile && isImageFile(socialLink.url) && (
            <div className="mb-4">
              <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-base-300">
                <img 
                  src={socialLink.url} 
                  alt="Image uploadée"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            </div>
          )}

          {isUploadedFile && isPDFFile(socialLink.url) && (
            <div className="mb-4">
              <div className="bg-base-200 p-4 rounded-xl border-2 border-base-300">
                <div className="flex items-center gap-3">
                  <FileText className="w-10 h-10 text-red-500" />
                  <div>
                    <p className="font-medium">Document PDF</p>
                    <p className="text-sm opacity-70">Cliquez pour télécharger</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isYouTubeUrl(socialLink.url) && isActive && (
            <div className="mb-4">
              <div className="relative w-full pt-[56.25%]">
                <iframe
                  src={getYouTubeEmbedUrl(socialLink.url)!}
                  frameBorder={0}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Affichage de la description en mode readonly */}
          {socialLink.description && (
            <div className="mb-4 bg-base-200/50 p-3 rounded-xl">
              <p className="text-sm text-base-content whitespace-pre-wrap break-words">
                {linkify(socialLink.description)}
              </p>
            </div>
          )}

          {isActive ? (
            <Link
              className={`btn w-full transition-all duration-300 group/link ${isUploadedFile ? 'btn-secondary' : 'btn-primary'} hover:scale-[1.02] hover:shadow-lg`}
              href={socialLink.url}
              target={isUploadedFile ? "_blank" : "_blank"}
              rel="noopener noreferrer"
              onClick={handleIncrementClick}
            >
              <span className="flex items-center justify-center gap-2">
                {isUploadedFile 
                  ? (isPDFFile(socialLink.url) ? 'Télécharger le PDF' : 'Voir l\'image') 
                  : 'Visiter le lien'}
                <ExternalLink className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </span>
            </Link>
          ) : (
            <div
              className={`btn w-full transition-all duration-300 btn-disabled`}
            >
              <span className="flex items-center justify-center gap-2">
                Lien désactivé
              </span>
            </div>
          )}

          {/* Section likes en mode readonly */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-base-300">
            <div className="flex items-center gap-2">
              <button
                className="btn btn-ghost btn-xs"
                onClick={handleToggleLike}
                disabled={!currentUserId || readonly}
                title={!currentUserId ? "Connectez-vous pour liker" : ""}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
              <span className="text-sm text-gray-600">
                {likesCount} like{likesCount !== 1 ? 's' : ''}
              </span>
            </div>
            
            {clicks > 0 && (
              <div className="text-sm text-gray-600">
                {clicks} clic{clicks !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`flex flex-col w-full p-4 sm:p-6 rounded-3xl gap-4 transition-all duration-300 overflow-hidden
          ${isActive 
            ? 'bg-gradient-to-br from-base-200 to-base-300 shadow-lg hover:shadow-xl' 
            : 'bg-base-300/70'}`}>

          {/* Header avec toggle et statut */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="tooltip" data-tip={isActive ? 'Actif' : 'Inactif'}>
                <div className={`w-3 h-3 rounded-full transition-all ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              </div>
              <span className={`badge badge-lg ${COULEURS_BG[colorIndex]} ${COULEURS[colorIndex]} border-0 truncate`}>
                @{socialLink.pseudo}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="tooltip" data-tip={isActive ? 'Désactiver' : 'Activer'}>
                <label className="swap swap-flip">
                  <input 
                    type="checkbox" 
                    checked={isActive}
                    onChange={handleToggleActive}
                    className="hidden"
                  />
                  <div className="swap-on">
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="swap-off">
                    <X className="w-5 h-5 text-gray-400" />
                  </div>
                </label>
              </div>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Type de contenu</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.title}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData({ ...formData, title: value })
                      // Si c'est un réseau social, passer en mode URL
                      if (value && value !== 'Image' && value !== 'Document PDF') {
                        setUseFileUpload(false)
                        setSelectedFile(null)
                      }
                    }}
                  >
                    <option value="">Sélectionner...</option>
                    <optgroup label="Fichiers">
                      <option value="Image">Image</option>
                      <option value="Document PDF">Document PDF</option>
                    </optgroup>
                    <optgroup label="Réseaux sociaux">
                      {socialLinksData.map(({ name }) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Pseudo</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Votre pseudo"
                    className="input input-bordered w-full"
                    value={formData.pseudo}
                    onChange={(e) =>
                      setFormData({ ...formData, pseudo: e.target.value })
                    }
                  />
                </div>

                {/* Section Upload de fichier ou URL */}
                <div className="form-control md:col-span-2">
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      className={`btn btn-sm ${useFileUpload ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={handleSwitchToFile}
                    >
                      <Upload className="w-4 h-4" />
                      Uploader un fichier
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${!useFileUpload ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={handleSwitchToUrl}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Lien URL
                    </button>
                  </div>

                  {useFileUpload ? (
                    <div className="space-y-4">
                      {/* Input fichier */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleFileChange}
                        className="file-input file-input-bordered w-full"
                        disabled={isUploading}
                      />

                      {/* Aperçu du fichier sélectionné */}
                      {selectedFile && (
                        <div className="mt-3 p-4 bg-base-200 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {isImageFile(selectedFile.type) ? (
                                <Image className="w-6 h-6 text-blue-500" />
                              ) : (
                                <FileText className="w-6 h-6 text-red-500" />
                              )}
                              <div>
                                <span className="font-medium truncate">
                                  {selectedFile.name}
                                </span>
                                <span className="text-xs opacity-70 block">
                                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {isImageFile(selectedFile.type) ? 'Image' : 'PDF'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={handleRemoveFile}
                              className="btn btn-ghost btn-xs"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Aperçu de l'image */}
                          {selectedFile && isImageFile(selectedFile.type) && (
                            <div className="mt-3">
                              <p className="text-sm font-medium mb-2">Aperçu :</p>
                              <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-base-300">
                                <img 
                                  src={URL.createObjectURL(selectedFile)} 
                                  alt="Aperçu de l'image"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            </div>
                          )}

                          {/* Barre de progression */}
                          {isUploading && (
                            <div className="mt-4">
                              <div className="flex justify-between text-sm mb-1">
                                <span>Upload en cours...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <progress
                                className="progress progress-primary w-full"
                                value={uploadProgress}
                                max="100"
                              />
                            </div>
                          )}

                          {/* Bouton d'upload */}
                          {!isUploading && (
                            <button
                              onClick={handleFileUpload}
                              className="btn btn-primary mt-4 w-full gap-2"
                              disabled={isUploading}
                            >
                              <Upload className="w-4 h-4" />
                              Uploader le fichier
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="label">
                        <span className="label-text font-semibold">URL du lien</span>
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        className="input input-bordered w-full"
                        value={formData.url}
                        onChange={(e) =>
                          setFormData({ ...formData, url: e.target.value })
                        }
                      />
                      
                      {/* Aperçu YouTube si c'est une URL YouTube */}
                      {formData.url && isYouTubeUrl(formData.url) && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Aperçu YouTube :</p>
                          <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden border-2 border-base-300">
                            <iframe
                              src={getYouTubeEmbedUrl(formData.url)!}
                              title="Aperçu YouTube"
                              className="absolute top-0 left-0 w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Nouveau champ pour la description */}
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text font-semibold">Description</span>
                    <span className="label-text-alt">(Optionnel)</span>
                  </label>
                  <textarea
                    placeholder="Entrez la description"
                    className="textarea textarea-bordered w-full h-24"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({
                      title: socialLink.title,
                      url: socialLink.url,
                      pseudo: socialLink.pseudo,
                      description: socialLink.description || '',
                    })
                    setSelectedFile(null)
                    setUseFileUpload(false)
                  }}
                  disabled={isLoading || isUploading}
                >
                  Annuler
                </button>
                <button
                  className="btn btn-primary gap-2"
                  onClick={handleUpdatedLink}
                  disabled={isLoading || isUploading || (useFileUpload && !selectedFile && !isUploadedFile)}
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Sauvegarder
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Contenu du lien */}
              <div className="flex flex-col gap-4 p-4 bg-base-300/50 rounded-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className={`p-3 rounded-2xl ${COULEURS_BG[colorIndex]}`}>
                      {isUploadedFile && isImageFile(formData.url) ? (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                          <Image className="w-4 h-4 text-white" />
                        </div>
                      ) : isUploadedFile && isPDFFile(formData.url) ? (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <SocialIcon
                          url={formData.url}
                          style={getSocialIconStyle}
                          bgColor={socialColor}
                        />
                      )}
                    </div>
                  </div>
                  <div className="grow">
                    <h3 className="font-bold truncate">
                      {isUploadedFile 
                        ? (isImageFile(formData.url) ? 'Image' : 'Document PDF') 
                        : socialLink.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="badge badge-sm badge-primary px-3 py-1 rounded-full shadow-sm truncate">
                        {isUploadedFile ? 'Fichier' : socialCategory}
                      </span>
                      <span className="badge badge-sm badge-accent px-3 py-1 rounded-full shadow-md hover:scale-105 transition-transform duration-200 truncate">
                        {socialLink.pseudo}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Aperçu de l'image uploadée */}
                {isUploadedFile && isImageFile(formData.url) && (
                  <div className="mt-2">
                    <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-base-300">
                      <img 
                        src={formData.url} 
                        alt="Image uploadée"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Aperçu PDF */}
                {isUploadedFile && isPDFFile(formData.url) && (
                  <div className="mt-2">
                    <div className="bg-base-200 p-4 rounded-xl border-2 border-base-300">
                      <div className="flex items-center gap-3">
                        <FileText className="w-10 h-10 text-red-500" />
                        <div>
                          <p className="font-medium">Document PDF</p>
                          <p className="text-sm opacity-70">Cliquez pour télécharger</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Aperçu YouTube */}
                {isYouTubeUrl(formData.url) && isActive && (
                  <div className="relative w-full pt-[56.25%]">
                    <iframe
                      src={getYouTubeEmbedUrl(formData.url)!}
                      frameBorder={0}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full rounded-lg"
                    />
                  </div>
                )}

                {/* Bouton pour afficher/cacher la description */}
                {formData.description && (
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        className="btn btn-xs btn-ghost gap-1"
                        onClick={() => setLocalShowDescription(!localShowDescription)}
                      >
                        {localShowDescription ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span className="text-xs">Cacher description</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span className="text-xs">Afficher description</span>
                          </>
                        )}
                      </button>
                      <span className="text-xs text-gray-500">
                        {formData.description.length} caractères
                      </span>
                    </div>
                  </div>
                )}

                {/* Affichage de la description avec liens cliquables */}
                {formData.description && localShowDescription && (
                  <div className="mt-3 bg-base-200/50 p-3 rounded-xl border border-base-300">
                    <p className="text-sm text-base-content whitespace-pre-wrap break-words">
                      {linkify(formData.description)}
                    </p>
                  </div>
                )}

                <div className="tooltip" data-tip={formData.url}>
                  <Link
                    href={formData.url}
                    target={isUploadedFile ? "_blank" : "_blank"}
                    rel="noopener noreferrer"
                    className="link link-hover text-sm opacity-90 flex items-center gap-1 mt-2"
                    onClick={isActive ? handleIncrementClick : undefined}
                  >
                    <span className="truncate">
                      {isUploadedFile 
                        ? (isPDFFile(formData.url) 
                            ? '📄 Voir le document PDF' 
                            : '🖼️ Voir l\'image') 
                        : truncateLink(formData.url, 30)}
                    </span>
                    {isUploadedFile && isPDFFile(formData.url) ? (
                      <Download className="w-3 h-3" />
                    ) : (
                      <ExternalLink className="w-3 h-3" />
                    )}
                  </Link>
                </div>
              </div>

              {/* Footer avec stats, likes et actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-base-300 gap-4 sm:gap-0">
                <div className="flex items-center gap-4">
                  {/* Bouton like */}
                  <div className="tooltip" data-tip={!currentUserId ? "Connectez-vous pour liker" : isLiked ? "Retirer le like" : "Ajouter un like"}>
                    <button
                      className="btn btn-ghost btn-sm gap-2"
                      onClick={handleToggleLike}
                      disabled={isLiking || !currentUserId}
                    >
                      {isLiking ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <Heart className={`w-4 h-4 transition-all ${isLiked ? 'fill-red-500 text-red-500 animate-pulse' : ''}`} />
                      )}
                      <span className={isLiked ? 'text-red-500 font-semibold' : ''}>
                        {likesCount}
                      </span>
                    </button>
                  </div>

                  {/* Compteur de clics */}
                  {clicks > 0 && (
                    <div className="tooltip" data-tip="Nombre de clics">
                      <div className={`flex items-center gap-2 px-3 py-2 bg-base-300 rounded-full border-2 ${BORDER_COULEURS[borderColorIndex]} transition-colors duration-500`}>
                        <ChartColumnIncreasing className="w-4 h-4" />
                        <span className="font-bold text-lg">{clicks}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    className="btn btn-sm btn-primary text-white gap-2 group/edit w-full sm:w-auto"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="w-4 h-4 group-hover/edit:rotate-12 transition-transform" />
                    Éditer
                  </button>

                  <button
                    className="btn btn-sm btn-error text-white gap-2 group/delete w-full sm:w-auto"
                    onClick={handleRemove}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      <Trash className="w-4 h-4 group-hover/delete:scale-110 transition-transform" />
                    )}
                    Supprimer
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