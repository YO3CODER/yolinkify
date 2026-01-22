"use client"

import Avatar from "@/app/components/Avatar"
import EmptyState from "@/app/components/EmptyState"
import LinkComponent from "@/app/components/LinkComponent"
import Logo from "@/app/components/Logo"
import { getSocialLinks, getUserInfo } from "@/app/server"
import { SocialLink } from "@prisma/client"
import { LogIn, UserPlus, Info, Search, Eye, EyeOff, Sparkles, Zap, Link as LinkIcon, Filter, Globe } from "lucide-react"
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
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-base-300 mb-4 shadow-sm">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
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

  const bgColors = [
    'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/10 dark:to-red-800/5',
    'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-800/5',
    'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/10 dark:to-green-800/5',
    'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-800/5',
    'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/10 dark:to-purple-800/5',
    'bg-gradient-to-br from-pink-50 to-pink-100/50 dark:from-pink-900/10 dark:to-pink-800/5',
    'bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-900/10 dark:to-cyan-800/5',
  ]

  const borderColors = [
    'border-red-200/50 dark:border-red-800/20',
    'border-blue-200/50 dark:border-blue-800/20',
    'border-green-200/50 dark:border-green-800/20',
    'border-amber-200/50 dark:border-amber-800/20',
    'border-purple-200/50 dark:border-purple-800/20',
    'border-pink-200/50 dark:border-pink-800/20',
    'border-cyan-200/50 dark:border-cyan-800/20',
  ]

  return (
    <div className="space-y-4">
      {/* Prévisualisation YouTube */}
      {link.title === "YouTube" && (
        <YoutubePreview url={link.url} />
      )}

      {/* Carte du lien */}
      <div className={`${bgColors[colorIndex]} p-4 lg:p-5 rounded-xl border ${borderColors[colorIndex]} shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1`}>
        {/* En-tête avec titre et bouton info */}
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-white/50 dark:bg-black/30 flex items-center justify-center">
                <Globe className="w-4 h-4 lg:w-5 lg:h-5 opacity-70" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm lg:text-base truncate">{link.title}</h3>
              <span className="text-xs opacity-60 truncate block">
                @{link.pseudo}
              </span>
            </div>
          </div>
          
          {/* Bouton pour afficher/masquer la description */}
          {link.description && (
            <button
              onClick={() => setShowDescription(!showDescription)}
              className="btn btn-ghost btn-circle btn-xs lg:btn-sm hover:bg-primary/10 transition-colors"
              aria-label="Afficher la description"
            >
              <Info className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${showDescription ? 'text-primary' : 'opacity-60'}`} />
            </button>
          )}
        </div>

        {/* Description (visible uniquement si cliqué) */}
        {showDescription && link.description && (
          <div className="mb-3 lg:mb-4 animate-fadeIn">
            <div className="bg-white/60 dark:bg-black/30 p-3 rounded-lg border border-base-300/50">
              <p className="text-sm text-base-content leading-relaxed whitespace-pre-line">
                {link.description}
              </p>
            </div>
          </div>
        )}

        {/* Lien principal */}
        <div className="mt-3 lg:mt-4">
          <LinkComponent 
            socialLink={link} 
            readonly 
            showDescription={false}
          />
        </div>

        {/* Stats */}
        {link.clicks > 0 && (
          <div className="mt-3 flex justify-end">
            <div className="flex items-center gap-1.5 text-xs font-medium opacity-80 bg-white/50 dark:bg-black/30 px-2 py-1 rounded-full">
              <Zap className="w-3 h-3" />
              <span>{link.clicks} clic{link.clicks > 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------ CARACTÉRISTIQUES STYLE ------------------ */
const StatsCard = ({ value, label, icon: Icon, color = "primary" }: { 
  value: number | string, 
  label: string, 
  icon: React.ComponentType<any>,
  color?: "primary" | "secondary" | "accent"
}) => {
  const colorClasses = {
    primary: 'bg-gradient-to-br from-primary/10 to-primary/5 text-primary border-primary/20',
    secondary: 'bg-gradient-to-br from-secondary/10 to-secondary/5 text-secondary border-secondary/20',
    accent: 'bg-gradient-to-br from-accent/10 to-accent/5 text-accent border-accent/20'
  }

  return (
    <div className={`flex flex-col items-center justify-center p-3 lg:p-4 rounded-xl border ${colorClasses[color]} transition-all duration-200 hover:scale-105 hover:shadow-md`}>
      <div className="flex items-center gap-2 mb-1 lg:mb-2">
        <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
        <div className="text-xl lg:text-2xl font-bold">{value}</div>
      </div>
      <div className="text-xs opacity-80">{label}</div>
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
  const [sortBy, setSortBy] = useState<'clicks' | 'title' | 'recent'>('recent')
  const [showOnlyWithDescription, setShowOnlyWithDescription] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'active'>('all')

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
      keys: ["title", "url", "description", "pseudo"],
      threshold: 0.3,
      includeScore: true,
    })
  }, [links])

  /* ----------- FILTRAGE ET TRI ----------- */
  const processedLinks = useMemo(() => {
    let result = [...links]
    
    // Filtre par recherche
    if (search.trim()) {
      result = fuse.search(search).map(result => result.item)
    }
    
    // Filtre par description
    if (showOnlyWithDescription) {
      result = result.filter(link => link.description && link.description.trim() !== "")
    }
    
    // Filtre par statut actif
    if (activeFilter === 'active') {
      result = result.filter(link => link.active)
    }
    
    // Tri
    switch (sortBy) {
      case 'clicks':
        result.sort((a, b) => b.clicks - a.clicks)
        break
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'recent':
      default:
        break
    }
    
    return result
  }, [search, fuse, links, showOnlyWithDescription, activeFilter, sortBy])

  // Compter les liens avec description
  const linksWithDescription = useMemo(() => 
    links.filter(link => link.description && link.description.trim() !== "").length,
    [links]
  )

  // Statistiques
  const totalClicks = useMemo(() => 
    links.reduce((sum, link) => sum + link.clicks, 0),
    [links]
  )

  const activeLinks = useMemo(() => 
    links.filter(link => link.active).length,
    [links]
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-100 to-base-200/50">
      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-6xl">
        {/* MODE MOBILE - Layout vertical avec scroll natif */}
        <div className="lg:hidden">
          {/* Header mobile */}
          <div className="sticky top-0 z-10 bg-base-100/80 backdrop-blur-sm pb-4 mb-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full blur-md"></div>
                <Avatar pseudo={pseudo || ""} />
              </div>
              
              <div className="text-center">
                <h1 className="text-xl font-bold">{pseudo}</h1>
                <p className="text-sm opacity-70 mt-1">Page de liens personnels</p>
              </div>
            </div>
          </div>

          {/* Stats mobiles */}
          {links.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatsCard 
                value={links.length} 
                label="Liens" 
                icon={LinkIcon} 
                color="primary"
              />
              <StatsCard 
                value={totalClicks} 
                label="Clics" 
                icon={Zap} 
                color="secondary"
              />
              <StatsCard 
                value={linksWithDescription} 
                label="Détails" 
                icon={Info} 
                color="accent"
              />
            </div>
          )}

          {/* Filtres mobiles */}
          <div className="bg-base-100 rounded-2xl p-4 border border-base-300 shadow-sm mb-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtres & Tri
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => setShowOnlyWithDescription(!showOnlyWithDescription)}
                  className={`btn btn-sm w-full justify-start gap-2 ${showOnlyWithDescription ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {showOnlyWithDescription ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showOnlyWithDescription ? 'Tous les liens' : 'Avec description'}
                </button>

                <select
                  className="select select-sm select-bordered w-full"
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active')}
                >
                  <option value="all">Tous les liens</option>
                  <option value="active">Liens actifs uniquement</option>
                </select>

                <select
                  className="select select-sm select-bordered w-full"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'clicks' | 'title' | 'recent')}
                >
                  <option value="recent">Plus récents</option>
                  <option value="clicks">Plus populaires</option>
                  <option value="title">Ordre alphabétique</option>
                </select>
              </div>
            </div>
          </div>

          {/* Indication pour les descriptions mobile */}
          {linksWithDescription > 0 && (
            <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-4 border border-primary/10 mb-6">
              <div className="flex items-center gap-2 text-primary">
                <Info className="w-4 h-4" />
                <div className="text-sm">
                  <span className="font-semibold">{linksWithDescription} lien{linksWithDescription > 1 ? 's' : ''}</span> avec détails
                </div>
              </div>
              <p className="text-xs opacity-70 mt-1">
                Cliquez sur l'icône ℹ️ pour voir les détails
              </p>
            </div>
          )}

          {/* Recherche mobile */}
          {links.length > 0 && (
            <div className="bg-base-100 rounded-2xl p-4 border border-base-300 shadow-sm mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 opacity-50" />
                <input
                  type="text"
                  className="w-full pl-12 pr-12 py-3 border border-base-300 rounded-xl bg-base-100 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                  placeholder="Rechercher un lien..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-50 hover:opacity-70"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Liens mobiles */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                <p className="text-sm opacity-70">Chargement des liens...</p>
              </div>
            ) : processedLinks.length > 0 ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">
                    Liens disponibles 
                    <span className="ml-2 badge badge-primary badge-sm">
                      {processedLinks.length}
                    </span>
                  </h2>
                </div>
                
                <div className="space-y-4">
                  {processedLinks.map(link => (
                    <LinkWithDescription key={link.id} link={link} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-base-100 rounded-2xl border border-base-300">
                <EmptyState
                  IconComponent="Link"
                  message={
                    search
                      ? "Aucun lien trouvé pour cette recherche"
                      : "Aucun lien disponible pour le moment"
                  }
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="btn btn-ghost btn-sm mt-4"
                  >
                    Effacer la recherche
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CTA mobile */}
          <div className="mt-8 pt-6 border-t border-base-300">
            <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-5 text-center border border-primary/10">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">Créez votre page gratuite</h3>
                </div>
                <p className="text-sm opacity-80">
                  Rassemblez tous vos liens sociaux en une seule page élégante
                </p>
                <div className="flex gap-3 mt-2">
                  <a href="/sign-up" className="btn btn-primary btn-sm px-4">
                    <UserPlus className="w-4 h-4" />
                    Commencer
                  </a>
                  <a href="/sign-in" className="btn btn-outline btn-sm px-4">
                    <LogIn className="w-4 h-4" />
                    Connexion
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODE DESKTOP - Layout horizontal avec scroll indépendant */}
        <div className="hidden lg:flex flex-row gap-8 h-[calc(100vh-4rem)]">
          {/* Sidebar desktop */}
          <div className="w-1/3 h-full overflow-y-auto pr-2">
            <div className="space-y-6 pb-8">
              {/* Logo et Avatar */}
              <div className="bg-base-100 rounded-2xl p-6 border border-base-300 shadow-sm">
                <div className="flex flex-col items-center space-y-4">
                  <div className="mb-2">
                    <Logo />
                  </div>
                  
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full blur-md"></div>
                    <Avatar pseudo={pseudo || ""} />
                  </div>
                  
                  <div className="text-center">
                    <h1 className="text-2xl font-bold">{pseudo}</h1>
                    <p className="text-sm opacity-70 mt-1">Page de liens personnels</p>
                  </div>
                </div>

                {/* Stats */}
                {links.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    <StatsCard 
                      value={links.length} 
                      label="Liens" 
                      icon={LinkIcon} 
                      color="primary"
                    />
                    <StatsCard 
                      value={totalClicks} 
                      label="Clics" 
                      icon={Zap} 
                      color="secondary"
                    />
                    <StatsCard 
                      value={linksWithDescription} 
                      label="Détails" 
                      icon={Info} 
                      color="accent"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-6">
                  <a href="/sign-up" className="btn btn-outline btn-sm w-full">
                    <UserPlus className="w-4 h-4" />
                    Créer votre page
                  </a>
                  <a href="/sign-in" className="btn btn-primary btn-sm w-full">
                    <LogIn className="w-4 h-4" />
                    Gérer vos liens
                  </a>
                </div>
              </div>

              {/* Filtres */}
              <div className="bg-base-100 rounded-2xl p-5 border border-base-300 shadow-sm">
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filtres & Tri
                  </h3>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowOnlyWithDescription(!showOnlyWithDescription)}
                      className={`btn btn-sm w-full justify-start gap-2 ${showOnlyWithDescription ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      {showOnlyWithDescription ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showOnlyWithDescription ? 'Tous les liens' : 'Avec description'}
                    </button>

                    <select
                      className="select select-sm select-bordered w-full"
                      value={activeFilter}
                      onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active')}
                    >
                      <option value="all">Tous les liens</option>
                      <option value="active">Liens actifs uniquement</option>
                    </select>

                    <select
                      className="select select-sm select-bordered w-full"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'clicks' | 'title' | 'recent')}
                    >
                      <option value="recent">Plus récents</option>
                      <option value="clicks">Plus populaires</option>
                      <option value="title">Ordre alphabétique</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Indication pour les descriptions */}
              {linksWithDescription > 0 && (
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-4 border border-primary/10">
                  <div className="flex items-center gap-2 text-primary">
                    <Info className="w-4 h-4" />
                    <div className="text-sm">
                      <span className="font-semibold">{linksWithDescription} lien{linksWithDescription > 1 ? 's' : ''}</span> avec détails
                    </div>
                  </div>
                  <p className="text-xs opacity-70 mt-1">
                    Cliquez sur l'icône ℹ️ pour voir les détails
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contenu principal desktop */}
          <div className="w-2/3 h-full overflow-y-auto pl-2">
            <div className="space-y-6 pb-8">
              {/* Recherche */}
              {links.length > 0 && (
                <div className="bg-base-100 rounded-2xl p-5 border border-base-300 shadow-sm">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-50" />
                    <input
                      type="text"
                      className="w-full pl-12 pr-12 py-3 border border-base-300 rounded-xl bg-base-100 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-base"
                      placeholder="Rechercher un lien par titre, pseudo ou description..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-50 hover:opacity-70"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Liens */}
              <div className="space-y-5">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                    <p className="text-sm opacity-70">Chargement des liens...</p>
                  </div>
                ) : processedLinks.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">
                        Liens disponibles 
                        <span className="ml-2 badge badge-primary badge-sm">
                          {processedLinks.length}
                        </span>
                      </h2>
                      <div className="text-xs opacity-70">
                        {search && `Résultats pour : "${search}"`}
                      </div>
                    </div>
                    
                    <div className="grid gap-5">
                      {processedLinks.map(link => (
                        <LinkWithDescription key={link.id} link={link} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 bg-base-100 rounded-2xl border border-base-300">
                    <EmptyState
                      IconComponent="Link"
                      message={
                        search
                          ? "Aucun lien trouvé pour cette recherche"
                          : "Aucun lien disponible pour le moment"
                      }
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="btn btn-ghost btn-sm mt-4"
                      >
                        Effacer la recherche
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer CTA */}
              <div className="mt-12 pt-8 border-t border-base-300">
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-6 text-center border border-primary/10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-primary" />
                      <h3 className="font-semibold text-xl">Créez votre page gratuite</h3>
                    </div>
                    <p className="text-base opacity-80 max-w-md">
                      Rassemblez tous vos liens sociaux en une seule page élégante
                    </p>
                    <div className="flex gap-3 mt-2">
                      <a href="/sign-up" className="btn btn-primary btn-md px-6">
                        <UserPlus className="w-4 h-4" />
                        Commencer maintenant
                      </a>
                      <a href="/sign-in" className="btn btn-outline btn-md px-6">
                        <LogIn className="w-4 h-4" />
                        Se connecter
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Page