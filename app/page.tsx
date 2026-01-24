"use client";

import Link from "next/link";
import Wrapper from "./components/Wrapper";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useRef, useCallback, memo, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import { addSocialLink, getSocialLinksWithLikes, getUserInfo, removeSocialLink, updateUserTheme, incrementClickCount } from "./server";
import { SocialLink } from "@prisma/client";
import { Copy, ExternalLink, Palette, Plus, Search, Eye, EyeOff, Upload, FileText, Image as ImageIcon, X, Download, File, Heart, Users, ArrowRight, Sparkles, Trash2 } from "lucide-react";
import socialLinksData from "./socialLinksData";
import EmptyState from "./components/EmptyState";
import LinkComponent from "./components/LinkComponent";
import Visualisation from "./components/Visualisation";

// Mémoïsation de la fonction de troncature
const truncateLink = (url: string, maxLength = 20) => {
  if (!url) return "";
  return url.length > maxLength
    ? url.substring(0, maxLength) + "..."
    : url;
};

// Mémoïsation de la validation d'URL
const isValidURL = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

// Fonction pour vérifier le type de fichier
const isImageFile = (file: File) => file.type.startsWith('image/');
const isPDFFile = (file: File) => file.type === 'application/pdf';

// Fonction pour détecter si une URL est une image
const isImageUrl = (url: string): boolean => {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
};

// Fonction pour détecter si une URL est un PDF
const isPdfUrl = (url: string): boolean => {
  if (!url) return false;
  return /\.pdf$/i.test(url);
};

// Fonction pour extraire l'ID YouTube
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  try {
    const parsedUrl = new URL(url);
    
    // Pour youtu.be
    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.slice(1).split('?')[0];
    }
    
    // Pour youtube.com
    if (parsedUrl.hostname.includes("youtube.com")) {
      // Vérifier le paramètre v
      const videoId = parsedUrl.searchParams.get("v");
      if (videoId) return videoId;
      
      // Vérifier les URLs embed
      const embedMatch = parsedUrl.pathname.match(/\/embed\/([^\/?]+)/);
      if (embedMatch) return embedMatch[1];
      
      // Vérifier les URLs watch
      const watchMatch = parsedUrl.pathname.match(/\/watch/);
      if (watchMatch) {
        const vParam = parsedUrl.searchParams.get("v");
        if (vParam) return vParam;
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

// Fonction pour détecter si une URL est YouTube
const isYouTubeUrl = (url: string): boolean => {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
};

// Composant de prévisualisation pour fichiers (memoïsé)
const FilePreview = memo(({ file, type }: { file: File, type: 'image' | 'pdf' }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  
  useEffect(() => {
    if (type === 'image') {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, type]);

  if (type === 'image') {
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-base-300">
        {imageUrl && (
          <img 
            src={imageUrl} 
            alt="Aperçu de l'image"
            className="w-full h-full object-contain"
            loading="lazy"
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3">
          <div className="flex items-center gap-2 text-white">
            <ImageIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Aperçu de l'image</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'pdf') {
    return (
      <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 p-6 rounded-lg border border-red-200 dark:border-red-800/30">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="w-16 h-20 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-10 h-10 text-red-500" />
            </div>
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              PDF
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-sm truncate max-w-xs">
              {file.name}
            </h4>
            <p className="text-xs opacity-70">
              {(file.size / 1024).toFixed(2)} KB • Document PDF
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Download className="w-4 h-4 opacity-70" />
              <span className="text-xs">Cliquez pour télécharger</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
});

FilePreview.displayName = 'FilePreview';

// Composant de prévisualisation pour URL (memoïsé)
const UrlPreview = memo(({ url }: { url: string }) => {
  const [previewType, setPreviewType] = useState<'none' | 'youtube' | 'image' | 'pdf'>('none');
  
  useEffect(() => {
    if (isYouTubeUrl(url)) {
      setPreviewType('youtube');
    } else if (isImageUrl(url)) {
      setPreviewType('image');
    } else if (isPdfUrl(url)) {
      setPreviewType('pdf');
    } else {
      setPreviewType('none');
    }
  }, [url]);

  if (previewType === 'youtube') {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) {
      return (
        <div className="bg-gradient-to-br from-red-50 to-blue-50 dark:from-red-900/10 dark:to-blue-900/10 p-6 rounded-lg border border-red-200 dark:border-red-800/30">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-16 h-20 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">YouTube Video</h4>
              <p className="text-xs opacity-70">
                Lien YouTube détecté
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <ExternalLink className="w-4 h-4 opacity-70" />
                <span className="text-xs">Ouvrir la vidéo</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-base-300">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1`}
          title="Prévisualisation YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3">
          <div className="flex items-center gap-2 text-white">
            <span className="text-sm font-medium"></span>
          </div>
        </div>
      </div>
    );
  }

  if (previewType === 'image') {
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-base-300">
        <img 
          src={url} 
          alt="Aperçu de l'image"
          className="w-full h-full object-contain"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            const parent = (e.target as HTMLElement).parentElement;
            if (parent) {
              const fallback = document.createElement('div');
              fallback.className = "w-full h-full flex items-center justify-center bg-base-200";
              fallback.innerHTML = `
                <div class="text-center">
                  <ImageIcon class="w-8 h-8 text-base-content/30 mx-auto mb-2" />
                  <p class="text-sm text-base-content/70">Image non disponible</p>
                </div>
              `;
              parent.appendChild(fallback);
            }
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3">
          <div className="flex items-center gap-2 text-white">
            <ImageIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Aperçu de l'image</span>
          </div>
        </div>
      </div>
    );
  }

  if (previewType === 'pdf') {
    return (
      <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 p-6 rounded-lg border border-red-200 dark:border-red-800/30">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="w-16 h-20 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-10 h-10 text-red-500" />
            </div>
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              PDF
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Document PDF en ligne</h4>
            <p className="text-xs opacity-70">
              Cliquez pour visualiser ou télécharger
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <ExternalLink className="w-4 h-4 opacity-70" />
              <span className="text-xs">Ouvrir le document</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
});

UrlPreview.displayName = 'UrlPreview';

interface SocialLinkWithLikes extends SocialLink {
  likesCount?: number;
  isLikedByCurrentUser?: boolean;
}

// Hook personnalisé pour le debounce
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Composant ImageCard pour afficher les images directement
const ImageCard = memo(({ 
  link, 
  onRemove, 
  showDescription,
  fetchLinks 
}: { 
  link: SocialLinkWithLikes;
  onRemove: (linkId: string) => Promise<void>;
  showDescription: boolean;
  fetchLinks: () => Promise<void>;
}) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLoadingLike, setIsLoadingLike] = useState(false);
  const [likesCount, setLikesCount] = useState(link.likesCount || 0);
  const [isLiked, setIsLiked] = useState(link.isLikedByCurrentUser || false);
  const [clicks, setClicks] = useState(link.clicks || 0);
  const [isLoadingClick, setIsLoadingClick] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove(link.id);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleLike = async () => {
    if (isLoadingLike) return;
    
    setIsLoadingLike(true);
    try {
      // Pour éviter l'erreur, on simule le like localement
      const newIsLiked = !isLiked;
      setIsLiked(newIsLiked);
      setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);
      
      toast.success(newIsLiked ? "Like ajouté!" : "Like retiré!");
    } catch (error) {
      console.error(error);
      // Annuler les changements en cas d'erreur
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
      toast.error("Erreur lors du traitement du like");
    } finally {
      setIsLoadingLike(false);
    }
  };

  const handleLinkClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isLoadingClick) return;
    
    setIsLoadingClick(true);
    
    try {
      // 1. Ouvrir le lien immédiatement pour une meilleure UX
      window.open(link.url, '_blank', 'noopener,noreferrer');
      
      // 2. Incrémenter le compteur via l'API server action
      try {
        await incrementClickCount(link.id);
        
        // Mettre à jour l'état local immédiatement
        setClicks(prev => prev + 1);
        
        // Rafraîchir les données pour synchroniser
        if (fetchLinks) {
          await fetchLinks();
        }
        
        console.log('Click incrementé avec succès');
      } catch (apiError) {
        console.error('Erreur server action, tentative avec fetch:', apiError);
        
        // Fallback: essayer avec fetch si l'action serveur échoue
        const response = await fetch('/api/clicks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ linkId: link.id }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setClicks(data.clicks || clicks + 1);
          if (fetchLinks) {
            await fetchLinks();
          }
        } else {
          // Fallback: incrémenter localement
          setClicks(prev => prev + 1);
        }
      }
      
    } catch (error) {
      console.error('Erreur:', error);
      // En cas d'erreur, incrémenter localement quand même
      setClicks(prev => prev + 1);
    } finally {
      setIsLoadingClick(false);
    }
  };

  const handleIncrementClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    handleLinkClick(event);
  };

  return (
    <div className="card bg-base-100 border border-base-300 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/50 w-full">
      <div className="p-4">
        {/* En-tête - MODIFIÉ pour prendre toute la largeur */}
        <div className="flex justify-between items-start mb-3 w-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-base truncate flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="truncate">{link.title}</span>
              </h3>
              {link.pseudo && (
                <span className="badge badge-primary badge-sm flex-shrink-0">
                  {link.pseudo}
                </span>
              )}
            </div>
            
            {showDescription && link.description && (
              <p className="text-sm text-base-content/70 mb-3 break-words">
                {link.description}
              </p>
            )}
          </div>

          <div className="flex-shrink-0 ml-2">
            <button
              onClick={handleRemove}
              disabled={isRemoving}
              className="btn btn-ghost btn-xs btn-circle hover:btn-error text-base-content/50 hover:text-error transition-all"
              title="Supprimer l'image"
            >
              {isRemoving ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="relative rounded-lg overflow-hidden border border-base-300 mb-3 w-full">
          <img 
            src={link.url} 
            alt={link.description || link.title || "Image"}
            className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const fallbackDiv = document.createElement('div');
                fallbackDiv.className = "w-full h-64 flex flex-col items-center justify-center bg-base-200 p-4";
                fallbackDiv.innerHTML = `
                  <div class="text-center mb-3">
                    <ImageIcon class="w-12 h-12 text-base-content/30 mx-auto mb-2" />
                    <p class="text-sm text-base-content/70 mb-2">Image non disponible</p>
                  </div>
                  <button class="btn btn-xs btn-outline">
                    Visiter le lien
                  </button>
                `;
                parent.appendChild(fallbackDiv);
              }
            }}
          />
          <button
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all duration-300 group cursor-pointer"
            onClick={handleLinkClick}
            title="Ouvrir l'image en grand"
            disabled={isLoadingClick}
          >
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center">
              <Eye className="w-8 h-8 text-white mb-1" />
              <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">Agrandir</span>
            </div>
          </button>
        </div>

        {/* Footer avec likes et actions - MODIFIÉ pour prendre toute la largeur */}
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <button
              
              disabled={isLoadingLike}
              className={`btn btn-xs gap-2 ${isLiked ? 'btn-error text-white' : 'btn-ghost hover:btn-error'}`}
             
            >
              {isLoadingLike ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span className="text-sm font-medium">{likesCount}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="badge badge-info badge-sm">Image</span>
            <button
              onClick={handleIncrementClick}
              disabled={isLoadingClick}
              className="btn btn-ghost btn-xs gap-1 hover:text-primary"
              title="Visiter le lien"
            >
              {isLoadingClick ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-xs hidden sm:inline">Ouvrir</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-base-300">
          {clicks > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium opacity-80 bg-white/50 dark:bg-black/30 px-2 py-1 rounded-full">
              <span>👁️ {clicks} clic{clicks > 1 ? 's' : ''}</span>
            </div>
          )}
          
          {likesCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium opacity-80 bg-white/50 dark:bg-black/30 px-2 py-1 rounded-full">
              <Heart className="w-3 h-3" />
              <span>{likesCount} like{likesCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ImageCard.displayName = 'ImageCard';

export default function Home() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress as string;
  const currentUserId = user?.id;

  const [pseudo, setPseudo] = useState<string | null | undefined>(null);
  const [theme, setTheme] = useState<string | null | undefined>(null);
  const [theme2, setTheme2] = useState<string | null | undefined>(null);
  const [link, setLink] = useState<string>(""); // Toujours initialisé avec une chaîne vide
  const [socialPseudo, setSocialPseudo] = useState<string>("");
  const [socialDescription, setSocialDescription] = useState<string>("");
  const [title, setTitle] = useState<string>(socialLinksData[0].name);
  const [links, setLinks] = useState<SocialLinkWithLikes[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // États pour l'upload de fichier
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useFileUpload, setUseFileUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce pour la recherche
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const isFirstRender = useRef(true);

  // Thèmes memoïsés
  const themes = useMemo(() => [
    "light", "dark", "cupcake", "bumblebee", "emerald", "corporate", "synthwave", "retro",
    "cyberpunk", "caramellatte", "halloween", "garden", "forest", "aqua", "lofi", "pastel",
    "fantasy", "wireframe", "black", "luxury", "dracula", "cmyk", "autumn", "business",
    "acid", "lemonade", "coffee", "winter", "dim", "nord", "sunset", "valentine", "abyss", "silk"
  ], []);

  // Données des liens sociaux memoïsées
  const socialLinksDataMemo = useMemo(() => socialLinksData, []);

  // Fonction pour rafraîchir les liens
  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      const userInfo = await getUserInfo(email);
      if (userInfo) {
        setPseudo(userInfo.pseudo);
        setTheme(userInfo.theme);
        setTheme2(userInfo.theme);
      }

      // Forcer le rafraîchissement sans cache
      const fetchedLinks = await getSocialLinksWithLikes(email, currentUserId);
      if (fetchedLinks) {
        setLinks(fetchedLinks);
      }
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors du fetch des liens:", error);
      toast.error("Impossible de récupérer les données");
      setLoading(false);
    }
  }, [email, currentUserId]);

  // Filtrer les liens en fonction de la recherche
  const filteredLinks = useMemo(() => {
    if (debouncedSearchQuery.trim() === "") {
      return links;
    }
    
    const query = debouncedSearchQuery.toLowerCase();
    return links.filter(link => {
      const url = link.url || "";
      const description = link.description || "";
      
      return (
        (link.title && link.title.toLowerCase().includes(query)) ||
        (link.pseudo && link.pseudo.toLowerCase().includes(query)) ||
        (url.toLowerCase().includes(query)) ||
        (description.toLowerCase().includes(query))
      );
    });
  }, [debouncedSearchQuery, links]);

  // Réinitialiser les états du fichier quand on change de type
  useEffect(() => {
    if (title !== "Image" && title !== "Document PDF") {
      setSelectedFile(null);
      setUseFileUpload(false);
      setLink(""); // Toujours une chaîne vide, jamais undefined
    }
  }, [title]);

  // Gérer la sélection de fichier
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier selon le titre sélectionné
    if (title === "Image" && !isImageFile(file)) {
      toast.error("Veuillez sélectionner une image (JPEG, PNG, GIF, etc.)");
      return;
    }

    if (title === "Document PDF" && !isPDFFile(file)) {
      toast.error("Veuillez sélectionner un fichier PDF");
      return;
    }

    // Limite de taille (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 10MB)");
      return;
    }

    setSelectedFile(file);
    setUseFileUpload(true);
    // Réinitialiser le champ URL quand on sélectionne un fichier
    setLink("");
  }, [title]);

  // Upload du fichier
  const handleFileUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('email', email);
      formData.append('title', title);
      formData.append('pseudo', socialPseudo);
      formData.append('description', socialDescription);

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Upload échoué');
      }

      const data = await response.json();
      
      // Utiliser l'URL retournée par l'API
      const fileUrl = data.url;
      
      // Ajouter le lien avec l'URL du fichier uploadé
      const newLink = await addSocialLink(email, title, fileUrl, socialPseudo, socialDescription);
      const modal = document.getElementById("social_links_form") as HTMLDialogElement;
      if (modal) modal.close();

      if (newLink) {
        // Rafraîchir les liens après l'ajout
        await fetchLinks();
      }

      // Réinitialiser tout
      resetForm();
      toast.success(`${title} ajouté avec succès 🥳`);
      
      // Réinitialiser la progression après 1 seconde
      setTimeout(() => setUploadProgress(0), 1000);

    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error("Erreur lors de l'upload du fichier");
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, email, title, socialPseudo, socialDescription, fetchLinks]);

  // Réinitialiser le formulaire
  const resetForm = useCallback(() => {
    setLink(""); // Toujours une chaîne vide
    setSocialPseudo("");
    setSocialDescription("");
    setTitle(socialLinksDataMemo[0].name);
    setSelectedFile(null);
    setUseFileUpload(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [socialLinksDataMemo]);

  const handleAddLink = useCallback(async () => {
    // Validation pour l'upload de fichier
    if (useFileUpload && selectedFile) {
      await handleFileUpload();
      return;
    }

    // Validation pour les URLs normales
    if (!link || link.trim() === "") {
      toast.error(`Veuillez ${title === "Image" ? "sélectionner une image" : title === "Document PDF" ? "sélectionner un PDF" : "entrer une URL"}`);
      return;
    }

    if (title !== "Image" && title !== "Document PDF" && !isValidURL(link)) {
      toast.error("Veuillez entrer une URL valide");
      return;
    }

    if (!socialPseudo || socialPseudo.trim() === "") {
      toast.error("Veuillez entrer un pseudo");
      return;
    }

    // Validation spécifique pour les réseaux sociaux
    if (title !== "Image" && title !== "Document PDF") {
      const selectedTitle = socialLinksDataMemo.find(l => l.name === title);
      if (selectedTitle?.root && selectedTitle.altRoot) {
        if (
          !link.startsWith(selectedTitle.root) &&
          !link.startsWith(selectedTitle.altRoot)
        ) {
          toast.error(
            `L'URL doit commencer par ${selectedTitle.root} ou par ${selectedTitle.altRoot}`
          );
          return;
        }
      }
    }

    try {
      const linkUrl = useFileUpload && selectedFile ? await uploadFile() : link;
      
      const newLink = await addSocialLink(email, title, linkUrl, socialPseudo, socialDescription);
      const modal = document.getElementById("social_links_form") as HTMLDialogElement;
      if (modal) modal.close();

      if (newLink) {
        // Rafraîchir les liens après l'ajout
        await fetchLinks();
      }

      resetForm();
      toast.success("Lien ajouté avec succès 🥳 ");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'ajout du lien");
    }
  }, [useFileUpload, selectedFile, handleFileUpload, link, title, socialPseudo, socialLinksDataMemo, email, fetchLinks, resetForm]);

  // Fonction pour uploader le fichier et retourner l'URL
  const uploadFile = useCallback(async (): Promise<string> => {
    if (!selectedFile) throw new Error("Aucun fichier sélectionné");

    const formData = new FormData();
    formData.append('file', selectedFile);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Upload échoué');
    const data = await response.json();
    return data.url;
  }, [selectedFile]);

  const handleRemoveLink = useCallback(async (linkId: string) => {
    try {
      await removeSocialLink(email, linkId);
      // Rafraîchir les liens après la suppression
      await fetchLinks();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression");
    }
  }, [email, fetchLinks]);

  useEffect(() => {
    if (email && isFirstRender.current) {
      fetchLinks();
      isFirstRender.current = false;
    }
  }, [email, fetchLinks]);

  const copyToClipboard = useCallback(() => {
    if (!pseudo) return;

    const url = `yolinkify.vercel.app/page/${pseudo}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Lien copié"))
      .catch(err => console.error("Erreur lors de la copie :", err));
  }, [pseudo]);

  const handleConfirmTheme = useCallback(async () => {
    try {
      if(theme){
         await updateUserTheme(email , theme)
        toast.success("Thème appliqué")
        setTheme2(theme)
      }
    } catch (error){
      console.error(error)
      toast.error("Erreur lors de l'application du thème");
    }
  }, [theme, email]);

  // Calculer le total des likes avec useMemo
  const totalLikes = useMemo(() => 
    links.reduce((total, link) => total + (link.likesCount || 0), 0),
    [links]
  );

  // Calculer les liens avec description
  const linksWithDescriptionCount = useMemo(() => 
    links.filter(l => l.description && l.description.trim() !== "").length,
    [links]
  );

  // Handlers memoïsés
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value || ""); // Toujours une chaîne vide si undefined
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const handleToggleDescriptionFilter = useCallback(() => {
    setShowDescription(prev => !prev);
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleSocialPseudoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSocialPseudo(e.target.value || ""); // Toujours une chaîne vide si undefined
  }, []);

  const handleSocialDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSocialDescription(e.target.value || ""); // Toujours une chaîne vide si undefined
  }, []);

  const handleLinkChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLink(e.target.value || ""); // CORRECTION ICI : Toujours une chaîne vide si undefined
  }, []);

  const handleCloseModal = useCallback(() => {
    const modal = document.getElementById("social_links_form") as HTMLDialogElement;
    if (modal) modal.close();
    resetForm();
  }, [resetForm]);

  const handleOpenModal = useCallback(() => {
    const modal = document.getElementById("social_links_form") as HTMLDialogElement;
    if (modal) modal.showModal();
  }, []);

  // Composants de rendu conditionnel
  const renderLoading = () => (
    <div className="my-8 flex justify-center items-center w-full">
      <div className="flex flex-col items-center gap-2">
        <span className="loading loading-spinner loading-md text-primary"></span>
        <p className="text-sm text-base-content/70">Chargement...</p>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center w-full py-8 bg-base-100 rounded-xl border border-dashed border-base-300">
      <EmptyState IconComponent={"Cable"} message={
        debouncedSearchQuery ? 
        "Aucun lien ne correspond à votre recherche 😭" : 
        "Aucun lien disponible ! 😭"
      } />
      {debouncedSearchQuery && (
        <button
          className="btn btn-sm btn-outline mt-3 hover:btn-primary transition-all"
          onClick={handleClearSearch}
        >
          Effacer la recherche
        </button>
      )}
    </div>
  );

  // Fonction pour afficher les liens
  const renderLinksList = () => {
    // Séparer les images des autres liens
    const imageLinks = filteredLinks.filter(link => isImageUrl(link.url));
    const otherLinks = filteredLinks.filter(link => !isImageUrl(link.url));

    return (
      <div className="space-y-6 w-full">
        {/* Section des images */}
        {imageLinks.length > 0 && (
          <div className="space-y-4 w-full">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">Images ({imageLinks.length})</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
              {imageLinks.map(link => (
                <div key={link.id} className="w-full">
                  <ImageCard
                    link={link}
                    onRemove={handleRemoveLink}
                    showDescription={showDescription}
                    fetchLinks={fetchLinks}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section des autres liens */}
        {otherLinks.length > 0 && (
          <div className="space-y-4 w-full">
            {(imageLinks.length > 0 || otherLinks.length > 0) && (
              <div className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-secondary" />
                <h3 className="font-bold text-lg">Liens ({otherLinks.length})</h3>
              </div>
            )}
            <div className="flex flex-col gap-4 w-full">
              {otherLinks.map(link => (
                <div key={link.id} className="w-full">
                  <LinkComponent
                    socialLink={link}
                    onRemove={handleRemoveLink}
                    readonly={false}
                    fetchLinks={fetchLinks}
                    showDescription={showDescription}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Wrapper>
      <Toaster position="top-right" reverseOrder={false} />

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-5rem)] w-full">
        {/* Colonne gauche - Agrandie (35%) avec scroll indépendant */}
        <div className="lg:w-2/5 lg:h-full lg:overflow-y-auto lg:pr-3 w-full">
          <div className="space-y-6 lg:pb-8 w-full">
            {pseudo && theme && (
              <div className="space-y-6 w-full">
                {/* En-tête dans la sidebar */}
                <div className="bg-gradient-to-br from-primary/10 via-base-200 to-base-200 rounded-2xl p-5 border border-base-300 shadow-sm w-full">
                  <div className="flex flex-col items-center space-y-4 w-full">
                    <div className="flex items-center gap-2 mb-2 w-full">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h2 className="font-bold text-lg">Tableau de bord</h2>
                    </div>
                    
                    <div className="text-center w-full">
                      <h1 className="text-xl font-bold">{pseudo}</h1>
                      <p className="text-sm opacity-70 mt-1">Gérez votre page de liens</p>
                    </div>
                  </div>
                </div>

                {/* Sélecteur de thème amélioré */}
                <div className="bg-base-100 rounded-2xl p-5 border border-base-300 shadow-sm w-full">
                  <div className="flex items-center gap-3 mb-4 w-full">
                    <Palette className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-lg">Personnalisation</h3>
                  </div>
                  
                  <div className="space-y-4 w-full">
                    <div className="w-full">
                      <label className="label">
                        <span className="label-text font-semibold">Thème de votre page</span>
                      </label>
                      <select
                        className="select select-bordered w-full focus:ring-1 focus:ring-primary/20"
                        value={theme || ""}
                        onChange={(e) => setTheme(e.target.value)}
                      >
                        {themes.map(themeOption => (
                          <option key={themeOption} value={themeOption}>
                            {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      className={`btn w-full ${theme === theme2 ? 'btn-disabled bg-base-300' : 'btn-primary'} 
                               flex items-center justify-center gap-2
                               bg-primary
                               hover:from-primary/90 hover:to-secondary/90
                               border-none shadow hover:shadow-md
                               hover:-translate-y-0.5 transition-all duration-200`}
                      disabled={theme === theme2}
                      title={theme === theme2 ? "Thème déjà appliqué" : "Appliquer le thème"}
                      onClick={handleConfirmTheme}
                    >
                      <Palette className="w-4 h-4 text-amber-50" />
                      <span className="text-amber-50">Appliquer le thème</span>
                    </button>
                  </div>
                </div>

                {/* Stats des likes améliorées */}
                <div className="bg-linear-to-br from-base-100 to-base-200 rounded-2xl p-5 border border-base-300 shadow-sm w-full">
                  <div className="flex items-center gap-3 mb-5 w-full">
                    <Heart className="w-6 h-6 text-primary" />
                    <div className="w-full">
                      <h3 className="font-bold text-lg">Statistiques</h3>
                      <p className="text-sm text-base-content/70">Engagement de votre page</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-base-200 rounded-xl p-4 w-full">
                      <div className="flex items-center gap-3 mb-2 w-full">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Heart className="w-5 h-5 text-primary" />
                        </div>
                        <div className="w-full">
                          <div className="stat-value text-2xl">{totalLikes}</div>
                          <div className="stat-title text-sm">Total des likes</div>
                        </div>
                      </div>
                      <div className="text-xs opacity-70">sur {links.length} liens</div>
                    </div>
                    
                    <div className="bg-base-200 rounded-xl p-4 w-full">
                      <div className="flex items-center gap-3 mb-2 w-full">
                        <div className="p-2 rounded-lg bg-secondary/10">
                          <Users className="w-5 h-5 text-secondary" />
                        </div>
                        <div className="w-full">
                          <div className="stat-value text-2xl">{links.length}</div>
                          <div className="stat-title text-sm">Liens actifs</div>
                        </div>
                      </div>
                      <div className="text-xs opacity-70">Publics et visibles</div>
                    </div>
                  </div>
                  
                  {links.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-base-300 w-full">
                      <div className="flex items-center justify-between text-sm w-full">
                        <span className="opacity-70">Liens avec description:</span>
                        <span className="font-semibold">
                          {linksWithDescriptionCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1 w-full">
                        <span className="opacity-70">Images:</span>
                        <span className="font-semibold">
                          {links.filter(link => isImageUrl(link.url)).length}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visualisation améliorée */}
                <div className="bg-base-100 rounded-2xl p-5 border border-base-300 shadow-sm w-full">
                  <div className="flex items-center gap-3 mb-4 w-full">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <div className="w-full">
                      <h3 className="font-bold text-lg">Aperçu instantané</h3>
                      <p className="text-sm text-base-content/70">Votre page publique</p>
                    </div>
                  </div>
                  <Visualisation
                    socialLinks={links}
                    pseudo={pseudo}
                    theme={theme || "retro"}
                  />
                  
                  <div className="mt-4 pt-4 border-t border-base-300 w-full">
                    <Link
                      href={`/page/${pseudo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group w-full"
                    >
                      <div className="btn w-full bg-error
                                 border-none text-white font-semibold
                                 shadow hover:shadow-md
                                 hover:-translate-y-0.5 transition-all duration-200
                                 transform flex items-center justify-center gap-3">
                        <span className="text-base">👁️ Voir ma page publique</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Bouton de copie dans la sidebar */}
                <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-2xl p-5 border border-base-300 shadow-sm w-full">
                  <div className="flex flex-col items-center space-y-3 w-full">
                    <h3 className="font-bold text-lg">Partagez votre page</h3>
                    <p className="text-sm text-center opacity-70">
                      Copiez le lien de votre page pour le partager
                    </p>
                    <button
                      className="btn btn-primary w-full gap-2"
                      onClick={copyToClipboard}
                      disabled={!pseudo}
                    >
                      <Copy className="w-4 h-4" />
                      Copier le lien
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite - Réduite (65%) avec scroll indépendant */}
        <div className="lg:w-3/5 lg:h-full lg:overflow-y-auto lg:pl-3 w-full">
          <div className="space-y-6 lg:pb-8 w-full">
            {/* Barre de recherche et boutons optimisés */}
            <div className="flex flex-col lg:flex-row gap-3 w-full">
              <div className="relative flex-grow w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-base-content/60" />
                </div>
                <input
                  type="text"
                  placeholder="Rechercher un lien..."
                  className="input input-bordered w-full pl-10 pr-10 py-3 text-sm
                           focus:ring-1 focus:ring-primary/20 focus:border-primary
                           transition-all duration-200"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
                {searchQuery && (
                  <button
                    className="absolute inset-y-0 right-0 pr-3 flex items-center 
                             hover:scale-110 transition-transform"
                    onClick={handleClearSearch}
                  >
                    <X className="h-4 w-4 text-base-content/40 hover:text-base-content" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  className="btn btn-sm btn-error flex items-center gap-2 text-amber-50
                           hover:btn-primary transition-all duration-200 group"
                  onClick={handleToggleDescriptionFilter}
                >
                  {showDescription ? (
                    <>
                      <EyeOff className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span className="hidden lg:inline text-xs">Cacher description</span>
                      <span className="lg:hidden">Cacher</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span className="hidden lg:inline text-xs">Afficher description</span>
                      <span className="lg:hidden">Afficher</span>
                    </>
                  )}
                </button>

                <button
                  className="btn btn-sm btn-primary flex items-center gap-2
                           secondary
                           hover:from-primary/90 hover:to-secondary/90
                           border-none shadow hover:shadow-md
                           hover:-translate-y-0.5 transition-all duration-200 group"
                  onClick={handleOpenModal}
                >
                  <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                  <span className="hidden lg:inline text-xs">Nouveau lien</span>
                  <span className="lg:hidden text-xs">Ajouter</span>
                </button>
              </div>
            </div>

            {/* Modal optimisé avec scroll fixé */}
            <dialog id="social_links_form" className="modal modal-middle">
              <div className="modal-box max-w-2xl max-h-[85vh] p-0 overflow-hidden flex flex-col w-full">
                <div className="bg-amber-400 p-4 shrink-0 w-full">
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <h3 className="font-bold text-xl text-white">Nouveau lien</h3>
                      <p className="text-white/80 text-xs mt-1">Ajouter vos liens publics</p>
                    </div>
                    <form method="dialog" className="bg-amber-300 rounded-lg">
                      <button 
                        className="btn btn-xs btn-circle btn-ghost text-white bg-danger hover:bg-white/20"
                        onClick={handleCloseModal}
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto flex-1 w-full">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 w-full">
                    <div className="form-control w-full">
                      <label className="label py-1">
                        <span className="label-text font-semibold">Type de contenu</span>
                      </label>
                      <select
                        className="select select-bordered select-sm w-full focus:ring-1 focus:ring-primary/20"
                        value={title}
                        onChange={handleTitleChange}
                      >
                        <optgroup label="Réseaux sociaux">
                          {socialLinksDataMemo.map(({ name }) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Fichiers">
                          <option value="Image">Image</option>
                          <option value="Document PDF">Document PDF</option>
                        </optgroup>
                      </select>
                    </div>

                    <div className="form-control w-full">
                      <label className="label py-1">
                        <span className="label-text font-semibold">Pseudo / Nom</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Votre pseudo ou nom"
                        className="input input-bordered input-sm w-full focus:ring-1 focus:ring-primary/20"
                        value={socialPseudo}
                        onChange={handleSocialPseudoChange}
                      />
                    </div>
                  </div>

                  {/* Champ Description */}
                  <div className="form-control w-full">
                    <label className="label py-1">
                      <span className="label-text font-semibold">Description</span>
                      <span className="label-text-alt text-xs">(Optionnel)</span>
                    </label>
                    <textarea
                      placeholder="Entrez une description pour votre lien..."
                      className="textarea textarea-bordered textarea-sm w-full h-20 focus:ring-1 focus:ring-primary/20"
                      value={socialDescription}
                      onChange={handleSocialDescriptionChange}
                    />
                  </div>

                  {/* Section Upload ou URL */}
                  <div className="space-y-3 w-full">
                    <label className="label py-1 w-full">
                      <span className="label-text font-semibold">
                        {title === "Image" ? "Image" : title === "Document PDF" ? "Document PDF" : "URL du lien"}
                      </span>
                    </label>

                    {/* Mode fichier pour Image/PDF */}
                    {(title === "Image" || title === "Document PDF") ? (
                      <div className="space-y-3 w-full">
                        {/* Input fichier */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={title === "Image" ? "image/*" : ".pdf"}
                          onChange={handleFileChange}
                          className="file-input file-input-bordered file-input-sm w-full"
                          disabled={isUploading}
                        />

                        {/* Aperçu du fichier sélectionné */}
                        {selectedFile && (
                          <div className="space-y-3 w-full">
                            <div className="bg-base-100 p-3 rounded-lg border border-base-300 w-full">
                              <div className="flex items-center justify-between mb-2 w-full">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {title === "Image" ? (
                                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                                      <ImageIcon className="w-4 h-4 text-blue-500" />
                                    </div>
                                  ) : (
                                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 flex-shrink-0">
                                      <FileText className="w-4 h-4 text-red-500" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <span className="font-medium text-sm block truncate">
                                      {selectedFile.name}
                                    </span>
                                    <span className="text-xs opacity-70">
                                      {(selectedFile.size / 1024).toFixed(2)} KB • {title}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                  }}
                                  className="btn btn-ghost btn-xs flex-shrink-0"
                                  disabled={isUploading}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Prévisualisation */}
                              <div className="mt-3 w-full">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium">Prévisualisation :</span>
                                </div>
                                <FilePreview 
                                  file={selectedFile} 
                                  type={title === "Image" ? "image" : "pdf"} 
                                />
                              </div>
                            </div>

                            {/* Barre de progression */}
                            {isUploading && (
                              <div className="mt-3 w-full">
                                <div className="flex justify-between text-xs mb-1">
                                  <span>Upload en cours...</span>
                                  <span className="font-medium">{uploadProgress}%</span>
                                </div>
                                <progress
                                  className="progress progress-primary w-full h-2"
                                  value={uploadProgress}
                                  max="100"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Mode URL pour réseaux sociaux */
                      <div className="space-y-3 w-full">
                        <input
                          type="url"
                          placeholder="https://..."
                          className="input input-bordered input-sm w-full focus:ring-1 focus:ring-primary/20"
                          value={link}
                          onChange={handleLinkChange}
                        />
                        
                        {/* Prévisualisation pour l'URL */}
                        {link && link.trim() !== "" && (
                          <div className="bg-base-100 p-3 rounded-lg border border-base-300 w-full">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium">Prévisualisation :</span>
                            </div>
                            <UrlPreview url={link} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Boutons fixes en bas */}
                <div className="p-4 border-t border-base-300 shrink-0 w-full">
                  <div className="flex gap-3 w-full">
                    <button
                      className="btn btn-sm btn-ghost flex-1 hover:btn-error transition-all"
                      onClick={handleCloseModal}
                      disabled={isUploading}
                    >
                      Annuler
                    </button>
                    <button
                      className="btn btn-sm btn-primary flex-1 gap-2
                               secondary
                               border-none shadow hover:shadow-md
                               hover:-translate-y-0.5 transition-all duration-200 group"
                      onClick={handleAddLink}
                      disabled={
                        isUploading || 
                        !socialPseudo || 
                        (title !== "Image" && title !== "Document PDF" && !link) ||
                        ((title === "Image" || title === "Document PDF") && !selectedFile)
                      }
                    >
                      {isUploading ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Upload...
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                          <span className="text-sm">Ajouter le lien</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Backdrop pour fermer le modal */}
              <form method="dialog" className="modal-backdrop">
                <button onClick={handleCloseModal}>close</button>
              </form>
            </dialog>

            {loading ? renderLoading() : 
             filteredLinks.length === 0 ? renderEmptyState() : renderLinksList()}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}