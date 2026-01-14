import { SocialLink } from '@prisma/client'
import React from 'react'
import Avatar from './Avatar'
import LinkComponent from './LinkComponent'
import EmptyState from './EmptyState'
import socialLinksData from '../socialLinksData'

interface VisualisationProps {
    socialLinks: SocialLink[]
    pseudo: string
    theme: string
}

const truncateLink = (url: string, maxLenght = 20) => {
    return url.length > maxLenght
        ? url.substring(0, maxLenght) + '...'
        : url
}

// --- Fonctions utilitaires pour YouTube ---
function extraireIdYoutube(url: string) {
    const regex =
        /(?:youtube\.com\/(?:.*v=|v\/|shorts\/)|youtu\.be\/)([^"&?/ ]{11})/
    const match = url.match(regex)
    return match ? match[1] : null
}

function isYoutubeLink(url: string) {
    return socialLinksData.find(
        (p) =>
            p.name === 'YouTube' &&
            (url.startsWith(p.root) || (p.altRoot && url.startsWith(p.altRoot)))
    )
}

function genererPreviewYoutube(url: string) {
    if (!isYoutubeLink(url)) return null
    const id = extraireIdYoutube(url)
    if (!id) return null
    return {
        thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${id}`,
    }
}

// --- Composant Visualisation ---
const Visualisation: React.FC<VisualisationProps> = ({
    socialLinks,
    pseudo,
    theme,
}) => {
    const activeLinks = socialLinks.filter(link => link.active)
    const url = `/page/${pseudo}`

    return (
        <div className="mockup-browser bg-base-200 hidden md:block">
            <div className="mockup-browser-toolbar">
                <div className="input">
                    <span className="text-sm">
                        {truncateLink(url)}
                    </span>
                </div>
            </div>

            <div
                data-theme={theme}
                className="h-full bg-base-100 flex flex-col items-center justify-center space-y-4 p-5"
            >
                <Avatar pseudo={pseudo} />

                <div className="w-full max-w-sm space-y-4">
                    {activeLinks.length > 0 ? (
                        <>
                            {activeLinks.map((link) => {
                                // Vérifier si c'est YouTube
                                const preview = genererPreviewYoutube(link.url)
                                return (
                                    <div key={link.id} className="space-y-2">
                                        {preview && (
                                            <div className="space-y-2">
                                                <img
                                                    src={preview.thumbnail}
                                                    alt="Prévisualisation YouTube"
                                                    className="w-full rounded-lg shadow-md"
                                                />
                                                <iframe
                                                    className="w-full aspect-video rounded-lg"
                                                    src={preview.embedUrl}
                                                    title="Lecteur YouTube"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            </div>
                                        )}
                                        <LinkComponent
                                            socialLink={link}
                                            readonly={true}
                                        />
                                    </div>
                                )
                            })}
                        </>
                    ) : (
                        <div className="flex justify-center items-center w-full">
                            <EmptyState
                                IconComponent="Cable"
                                message="Aucun lien disponible 😭"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Visualisation
