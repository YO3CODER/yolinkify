"use client"

import Avatar from "@/app/components/Avatar"
import EmptyState from "@/app/components/EmptyState"
import LinkComponent from "@/app/components/LinkComponent"
import Logo from "@/app/components/Logo"
import { getSocialLinks, getUserInfo } from "@/app/server"
import { SocialLink } from "@prisma/client"
import { LogIn, UserPlus, Info } from "lucide-react"
import React, { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import Fuse from "fuse.js"

/* ------------------ YOUTUBE UTILS ------------------ */
const getYoutubeVideoId = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url)

    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.slice(1)
    }

    if (parsedUrl.searchParams.get("v")) {
      return parsedUrl.searchParams.get("v")
    }

    if (parsedUrl.pathname.includes("/embed/")) {
      return parsedUrl.pathname.split("/embed/")[1]
    }

    return null
  } catch {
    return null
  }
}

/* ------------------ PREVIEW COMPONENT ------------------ */
const YoutubePreview = ({ url }: { url: string }) => {
  const videoId = getYoutubeVideoId(url)
  if (!videoId) return null

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg border border-base-300">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="Prévisualisation YouTube"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  )
}

/* ------------------ LIEN AVEC DESCRIPTION ------------------ */
const LinkWithDescription = ({ link }: { link: SocialLink }) => {
  const [showDescription, setShowDescription] = useState(false)

  // Couleur dynamique basée sur l'ID
  const colorIndex = useMemo(() => 
    Math.abs(link.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 7,
    [link.id]
  )

  const borderColors = [
    'border-red-500/30',
    'border-blue-500/30',
    'border-green-500/30',
    'border-amber-500/30',
    'border-purple-500/30',
    'border-pink-500/30',
    'border-cyan-500/30',
  ]

  return (
    <div className="relative">
      {/* Prévisualisation YouTube */}
      {link.title === "YouTube" && (
        <YoutubePreview url={link.url} />
      )}

      {/* Carte du lien */}
      <div className={`bg-gradient-to-br from-base-200 to-base-300 p-4 sm:p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 ${borderColors[colorIndex]}`}>
        {/* En-tête avec titre et bouton info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg truncate">{link.title}</h3>
            <span className="badge badge-sm badge-outline">@{link.pseudo}</span>
          </div>
          
          {/* Bouton pour afficher/masquer la description */}
          {link.description && (
            <button
              onClick={() => setShowDescription(!showDescription)}
              className="btn btn-circle btn-ghost btn-sm"
              aria-label="Afficher la description"
            >
              <Info className={`w-4 h-4 transition-transform ${showDescription ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Description (visible uniquement si cliqué) */}
        {showDescription && link.description && (
          <div className="mb-4 animate-fadeIn">
            <div className="bg-base-300/50 p-4 rounded-2xl">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {link.description}
              </p>
            </div>
          </div>
        )}

        {/* Lien principal */}
        <div className="mt-4">
          <LinkComponent socialLink={link} readonly />
        </div>

        {/* Badge de catégorie */}
        {link.description && !showDescription && (
          <div className="mt-3 flex justify-end">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Description disponible
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------ PAGE ------------------ */
const Page = ({ params }: { params: Promise<{ pseudo: string }> }) => {
  const [pseudo, setPseudo] = useState<string | null>()
  const [loading, setLoading] = useState(true)
  const [links, setLinks] = useState<SocialLink[]>([])
  const [theme, setTheme] = useState<string | null>()
  const [search, setSearch] = useState("")

  /* ----------- FETCH DATA ----------- */
  const resolvedParamsAndFetchData = async () => {
    try {
      setLoading(true)

      const resolvedParams = await params
      const userInfo = await getUserInfo(resolvedParams.pseudo)
      if (!userInfo) throw new Error("User not found")

      setPseudo(userInfo.pseudo)
      setTheme(userInfo.theme)

      document.documentElement.setAttribute(
        "data-theme",
        userInfo.theme || "retro"
      )

      const fetchedLinks = await getSocialLinks(resolvedParams.pseudo)
      setLinks(fetchedLinks || [])
    } catch {
      toast.error("Cette page n'existe pas !")
      setPseudo(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    resolvedParamsAndFetchData()
  }, [params])

  /* ----------- FUSE (RECHERCHE INTELLIGENTE) ----------- */
  const fuse = useMemo(() => {
    return new Fuse(links, {
      keys: ["title", "url", "description", "pseudo"], // Ajout de la description dans la recherche
      threshold: 0.4,
    })
  }, [links])

  const filteredLinks = useMemo(() => {
    if (!search.trim()) return links
    return fuse.search(search).map(result => result.item)
  }, [search, fuse, links])

  // Compter les liens avec description
  const linksWithDescription = useMemo(() => 
    links.filter(link => link.description && link.description.trim() !== "").length,
    [links]
  )

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col items-center space-y-6 max-w-lg mx-auto">
        <Logo />

        {pseudo ? (
          <>
            <Avatar pseudo={pseudo} />

            {/* Informations sur les descriptions */}
            {linksWithDescription > 0 && (
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  📝 {linksWithDescription} lien{linksWithDescription > 1 ? 's' : ''} avec description
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Cliquez sur l'icône <Info className="inline w-3 h-3" /> pour voir les détails
                </p>
              </div>
            )}

            {/* ACTIONS */}
            <div className="flex gap-4 flex-wrap justify-center">
              <a href="/sign-up" className="btn btn-sm btn-outline">
                <UserPlus className="w-4 h-4" />
                Créer votre page
              </a>

              <a href="/sign-in" className="btn btn-sm btn-primary">
                <LogIn className="w-4 h-4" />
                Gérer vos liens
              </a>
            </div>

            {/* 🔍 RECHERCHE */}
            <div className="w-full max-w-sm">
              <label className="input input-bordered flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="w-4 h-4 opacity-70"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"
                  />
                </svg>

                <input
                  type="text"
                  className="grow"
                  placeholder="Rechercher un lien ou une description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>

            {/* 🔗 LIENS */}
            <div className="w-full space-y-4">
              {loading ? (
                <div className="flex justify-center py-20">
                  <span className="loading loading-spinner loading-lg text-primary" />
                </div>
              ) : filteredLinks.length > 0 ? (
                filteredLinks.map(link => (
                  <LinkWithDescription key={link.id} link={link} />
                ))
              ) : (
                <EmptyState
                  IconComponent="Link"
                  message={
                    search
                      ? "Aucun lien trouvé 🔍"
                      : "Aucun lien disponible 😭"
                  }
                />
              )}
            </div>

            {/* Statistiques */}
            {!loading && links.length > 0 && (
              <div className="text-center mt-8 pt-4 border-t border-base-300">
                <p className="text-sm text-gray-500">
                  📊 {links.length} lien{links.length > 1 ? 's' : ''} • 
                  {" "}{links.filter(l => l.active).length} actif{links.filter(l => l.active).length > 1 ? 's' : ''} • 
                  {" "}{links.reduce((sum, link) => sum + link.clicks, 0)} clics au total
                </p>
              </div>
            )}
          </>
        ) : (
          /* 404 */
          <div className="flex flex-col items-center justify-center h-screen bg-base-200 text-center p-4 rounded-3xl">
            <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-xl">
              <h1 className="text-6xl font-extrabold text-error mb-4 animate-bounce">
                404
              </h1>
              <p className="text-2xl font-semibold">
                Page non trouvée
              </p>
              <p className="mt-2 text-gray-500">
                Désolé, la page que vous recherchez n'existe pas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Page