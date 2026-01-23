import { SocialLink } from '@prisma/client'
import React, { useState, useEffect } from 'react'
import Avatar from './Avatar'
import LinkComponent from './LinkComponent'
import EmptyState from './EmptyState'
import socialLinksData from '../socialLinksData'
import { ExternalLink, RefreshCw, Eye, EyeOff, Maximize2, Minimize2, Play, Pause } from 'lucide-react'

interface VisualisationProps {
    socialLinks: SocialLink[]
    pseudo: string
    theme: string
}

interface YouTubePreview {
    thumbnail: string
    embedUrl: string
    title?: string
    channel?: string
}

const truncateLink = (url: string, maxLength = 35) => {
    return url.length > maxLength
        ? url.substring(0, maxLength) + '...'
        : url
}

// --- Fonctions utilitaires pour YouTube ---
function extraireIdYoutube(url: string) {
    const regex =
        /(?:youtube\.com\/(?:.*v=|v\/|shorts\/|embed\/|watch\?v=)|youtu\.be\/)([^"&?/ ]{11})/
    const match = url.match(regex)
    return match ? match[1] : null
}

function isYoutubeLink(url: string) {
    return socialLinksData.find(
        (p) =>
            p.name === 'YouTube' &&
            (url.includes('youtube.com') || url.includes('youtu.be'))
    )
}

async function genererPreviewYoutube(url: string): Promise<YouTubePreview | null> {
    if (!isYoutubeLink(url)) return null
    const id = extraireIdYoutube(url)
    if (!id) return null
    
    return {
        thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${id}?autoplay=0&rel=0&modestbranding=1`,
        title: "Vidéo YouTube",
        channel: "Chaîne YouTube"
    }
}

// --- Composant Visualisation ---
const Visualisation: React.FC<VisualisationProps> = ({
    socialLinks,
    pseudo,
    theme,
}) => {
    const [activeLinks, setActiveLinks] = useState<SocialLink[]>([])
    const [youtubePreviews, setYoutubePreviews] = useState<Record<string, YouTubePreview>>({})
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [showDescriptions, setShowDescriptions] = useState(true)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [autoPlayVideo, setAutoPlayVideo] = useState(false)
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null)

    const url = `/page/${pseudo}`

    // Filtrer les liens actifs
    useEffect(() => {
        setActiveLinks(socialLinks.filter(link => link.active))
    }, [socialLinks])

    // Récupérer les prévisualisations YouTube
    useEffect(() => {
        const fetchYoutubePreviews = async () => {
            const previews: Record<string, YouTubePreview> = {}
            
            for (const link of activeLinks) {
                if (isYoutubeLink(link.url)) {
                    const preview = await genererPreviewYoutube(link.url)
                    if (preview) {
                        previews[link.id] = preview
                    }
                }
            }
            
            setYoutubePreviews(previews)
        }

        if (activeLinks.length > 0) {
            fetchYoutubePreviews()
        }
    }, [activeLinks])

    const handleRefresh = () => {
        setIsRefreshing(true)
        setTimeout(() => {
            setIsRefreshing(false)
        }, 1000)
    }

    const handleToggleFullscreen = () => {
        setIsFullscreen(!isFullscreen)
    }

    const handleVideoPlay = (linkId: string) => {
        setActiveVideoId(linkId)
    }

    const handleVideoPause = () => {
        setActiveVideoId(null)
    }

    return (
        <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-base-100' : ''}`}>
            <div className={`mockup-browser bg-base-200 border-2 border-base-300 ${isFullscreen ? 'h-screen' : 'hidden md:block'}`}>
                {/* Toolbar avec contrôles */}
                <div className="mockup-browser-toolbar bg-linear-to-r from-base-300 to-base-200">
                    <div className="flex items-center justify-between w-full px-4 py-3">
                       
                        <div className="flex-1 flex justify-center">
                          
                        </div>
                        
                        <div className="flex items-center gap-2 flex-1 justify-end">
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="btn btn-ghost btn-xs tooltip"
                                data-tip="Actualiser"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                            
                           
                            
                            <button
                                onClick={() => setAutoPlayVideo(!autoPlayVideo)}
                                className="btn btn-ghost btn-xs tooltip"
                                data-tip={autoPlayVideo ? "Désactiver autoplay" : "Activer autoplay"}
                            >
                                {autoPlayVideo ? 
                                    <Pause className="w-4 h-4" /> : 
                                    <Play className="w-4 h-4" />
                                }
                            </button>
                            
                            <button
                                onClick={handleToggleFullscreen}
                                className="btn btn-ghost btn-xs tooltip"
                                data-tip={isFullscreen ? "Quitter plein écran" : "Plein écran"}
                            >
                                {isFullscreen ? 
                                    <Minimize2 className="w-4 h-4" /> : 
                                    <Maximize2 className="w-4 h-4" />
                                }
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contenu principal */}
                <div
                    data-theme={theme}
                    className="h-full bg-base-100 flex flex-col items-center justify-start p-6 overflow-y-auto"
                    style={{ maxHeight: isFullscreen ? 'calc(100vh - 70px)' : '600px' }}
                >
                    {/* Avatar avec effets */}
                    <div className="relative group">
                        <div className="absolute -inset-2 secondary rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                        <Avatar pseudo={pseudo} />
                    </div>
                    
                    {/* Badge avec nombre de liens */}
                    <div className="mt-4 mb-6">
                        <div className="badge badge-lg badge-primary gap-2 px-4 py-3">
                            <span className="font-bold">{activeLinks.length}</span>
                            <span>lien{activeLinks.length > 1 ? 's' : ''} actif{activeLinks.length > 1 ? 's' : ''}</span>
                        </div>
                    </div>

                    {/* Liste des liens */}
                    <div className="w-full max-w-sm space-y-4">
                        {activeLinks.length > 0 ? (
                            <>
                                {activeLinks.map((link) => {
                                    const youtubePreview = youtubePreviews[link.id]
                                    const isVideoActive = activeVideoId === link.id
                                    
                                    return (
                                        <div key={link.id} className="space-y-3 group">
                                            {/* Prévisualisation YouTube améliorée */}
                                            {youtubePreview && (
                                                <div className="space-y-3">
                                                    <div className="relative rounded-xl overflow-hidden border-2 border-base-300 shadow-lg group-hover:shadow-xl transition-all duration-300">
                                                        <div className="relative">
                                                            <img
                                                                src={youtubePreview.thumbnail}
                                                                alt="Prévisualisation YouTube"
                                                                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                                                                loading="lazy"
                                                            />
                                                            <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <button
                                                                    onClick={() => isVideoActive ? handleVideoPause() : handleVideoPlay(link.id)}
                                                                    className="btn btn-circle btn-primary btn-lg opacity-0 group-hover:opacity-100 transform group-hover:scale-100 scale-90 transition-all duration-300"
                                                                >
                                                                    {isVideoActive ? 
                                                                        <Pause className="w-6 h-6" /> : 
                                                                        <Play className="w-6 h-6" />
                                                                    }
                                                                </button>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Info de la vidéo */}
                                                        <div className="p-3 bg-base-200">
                                                            <h4 className="font-bold text-sm truncate">{youtubePreview.title}</h4>
                                                            <p className="text-xs opacity-70 truncate">{youtubePreview.channel}</p>
                                                            
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Iframe YouTube (conditionnelle) */}
                                                    {isVideoActive && (
                                                        <div className="relative pt-[56.25%] rounded-xl overflow-hidden border-2 border-primary shadow-lg">
                                                            <iframe
                                                                className="absolute top-0 left-0 w-full h-full"
                                                                src={youtubePreview.embedUrl + (autoPlayVideo ? '&autoplay=1' : '')}
                                                                title="Lecteur YouTube"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Composant de lien */}
                                            <div className={youtubePreview ? 'mt-2' : ''}>
                                                <LinkComponent
                                                    socialLink={link}
                                                    readonly={true}
                                                    showDescription={showDescriptions}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                                
                                {/* Statut en bas */}
                                <div className="pt-4 border-t border-base-300">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                           

                                        </div>
                                       
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center w-full py-10 space-y-4">
                                <EmptyState
                                    IconComponent="Cable"
                                    message="Aucun lien actif pour le moment 😭"
                                />
                                <p className="text-sm opacity-70 text-center max-w-xs">
                                    Ajoutez et activez des liens pour les voir apparaître ici
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Overlay pour le mode plein écran */}
            {isFullscreen && (
                <div className="fixed bottom-4 right-4 z-50">
                    <button
                        onClick={handleToggleFullscreen}
                        className="btn btn-circle btn-primary btn-lg shadow-lg"
                    >
                        <Minimize2 className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    )
}

export default Visualisation