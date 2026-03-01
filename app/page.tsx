"use client";

import Link from "next/link";
import Wrapper from "./components/Wrapper";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useRef, useCallback, memo, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import { addSocialLink, getSocialLinksWithLikes, getUserInfo, removeSocialLink, updateUserTheme, incrementClickCount } from "./server";
import { SocialLink } from "@prisma/client";
import { Copy, ExternalLink, Palette, Plus, Search, Eye, EyeOff, Upload, FileText, Image as ImageIcon, X, Download, File, Heart, Users, ArrowRight, Sparkles, Trash2, Check, XCircle, FolderOpen, Info, Video, FileIcon, LinkIcon, VideoIcon } from "lucide-react";
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

// Fonction pour vérifier le type de fichier - AJOUT VIDÉO
const isImageFile = (file: File) => file.type.startsWith('image/');
const isPDFFile = (file: File) => file.type === 'application/pdf';
const isVideoFile = (file: File) => file.type.startsWith('video/');

// Formats vidéo supportés
const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/avi',
  'video/mpeg'
];

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

// Fonction pour détecter si une URL est une vidéo - NOUVELLE FONCTION
const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv|m4v|mpg|mpeg)$/i.test(url);
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

// Composant LinkifyText pour rendre les liens cliquables
const LinkifyText = memo(({ text }: { text: string }) => {
  if (!text || typeof text !== 'string') return null;

  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  urlRegex.lastIndex = 0;
  
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    let url = match[0];
    let displayText = url;
    
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    }
    
    if (displayText.length > 50) {
      displayText = displayText.substring(0, 47) + '...';
    }
    
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium break-all inline-flex items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          window.open(url, '_blank', 'noopener,noreferrer');
        }}
        title={`Ouvrir ${url}`}
      >
        {displayText}
        <ExternalLink className="w-3 h-3" />
      </a>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  if (parts.length === 0) {
    return <>{text}</>;
  }
  
  return <>{parts}</>;
});

LinkifyText.displayName = 'LinkifyText';

// Composant de prévisualisation pour fichiers (memoïsé) - AJOUT VIDÉO
const FilePreview = memo(({ file, type }: { file: File, type: 'image' | 'pdf' | 'video' }) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  useEffect(() => {
    if (type === 'image' || type === 'video') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, type]);

  if (type === 'image') {
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-base-300">
        {previewUrl && (
          <img 
            src={previewUrl} 
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

  if (type === 'video') {
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-base-300">
        {previewUrl && (
          <video 
            src={previewUrl}
            className="w-full h-full object-contain"
            controls
            preload="metadata"
            poster={file.type.startsWith('video/') ? undefined : ''}
          >
            Votre navigateur ne supporte pas la lecture de vidéos.
          </video>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3">
          <div className="flex items-center gap-2 text-white">
            <Video className="w-4 h-4" />
            <span className="text-sm font-medium">Aperçu de la vidéo</span>
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

// Composant pour prévisualiser plusieurs fichiers
const MultipleFilesPreview = memo(({ 
  files, 
  onRemove,
  fileType 
}: { 
  files: File[], 
  onRemove: (index: number) => void,
  fileType: 'image' | 'video'
}) => {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);

  if (files.length === 0) return null;

  const typeLabel = fileType === 'image' ? 'image(s)' : 'vidéo(s)';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {fileType === 'image' ? (
            <ImageIcon className="w-5 h-5 text-primary" />
          ) : (
            <Video className="w-5 h-5 text-primary" />
          )}
          <span className="font-medium text-sm">
            {files.length} {typeLabel} sélectionnée{files.length > 1 ? 's' : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            for (let i = files.length - 1; i >= 0; i--) {
              onRemove(i);
            }
          }}
          className="btn btn-xs btn-ghost text-error hover:bg-error/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Tout supprimer
        </button>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2">
        {files.map((file, index) => (
          <div key={index} className="relative group">
            <div className="aspect-square rounded-lg overflow-hidden border border-base-300 bg-base-200">
              {fileType === 'image' && previewUrls[index] ? (
                <img 
                  src={previewUrls[index]} 
                  alt={`Aperçu ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : fileType === 'video' && previewUrls[index] ? (
                <video 
                  src={previewUrls[index]}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
              ) : null}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110 z-10"
                title="Supprimer ce fichier"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="mt-1">
              <p className="text-xs truncate px-1">{file.name}</p>
              <p className="text-xs opacity-70">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-base-content/70 flex items-center gap-2">
        <Check className="w-3 h-3 text-success" />
        <span>Les fichiers seront uploadés en une seule fois</span>
      </div>
    </div>
  );
});

MultipleFilesPreview.displayName = 'MultipleFilesPreview';

// Composant de prévisualisation pour URL (memoïsé) - AJOUT VIDÉO
const UrlPreview = memo(({ url }: { url: string }) => {
  const [previewType, setPreviewType] = useState<'none' | 'youtube' | 'image' | 'pdf' | 'video'>('none');
  
  useEffect(() => {
    if (isYouTubeUrl(url)) {
      setPreviewType('youtube');
    } else if (isImageUrl(url)) {
      setPreviewType('image');
    } else if (isPdfUrl(url)) {
      setPreviewType('pdf');
    } else if (isVideoUrl(url)) {
      setPreviewType('video');
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

  if (previewType === 'video') {
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-base-300">
        <video 
          src={url}
          className="w-full h-full object-contain"
          controls
          preload="metadata"
        >
          Votre navigateur ne supporte pas la lecture de vidéos.
        </video>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3">
          <div className="flex items-center gap-2 text-white">
            <Video className="w-4 h-4" />
            <span className="text-sm font-medium">Aperçu de la vidéo</span>
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

// Composant VideoCard pour afficher les vidéos directement - AVEC SAUVEGARDE DE POSITION
const VideoCard = memo(({ 
  link, 
  onRemove, 
  showDescription,
  fetchLinks,
  savedPosition,
  onPositionChange
}: { 
  link: SocialLinkWithLikes;
  onRemove: (linkId: string) => Promise<void>;
  showDescription: boolean;
  fetchLinks: () => Promise<void>;
  savedPosition?: number;
  onPositionChange?: (linkId: string, position: number) => void;
}) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLoadingLike, setIsLoadingLike] = useState(false);
  const [likesCount, setLikesCount] = useState(link.likesCount || 0);
  const [isLiked, setIsLiked] = useState(link.isLikedByCurrentUser || false);
  const [clicks, setClicks] = useState(link.clicks || 0);
  const [isLoadingClick, setIsLoadingClick] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSaveTime = useRef<number>(0);

  // Restaurer la position sauvegardée
  useEffect(() => {
    if (videoRef.current && savedPosition && savedPosition > 0) {
      videoRef.current.currentTime = savedPosition;
    }
  }, [savedPosition]);

  // Sauvegarder la position quand la vidéo est mise en pause
  const handlePause = useCallback(() => {
    if (videoRef.current && onPositionChange) {
      const currentTime = videoRef.current.currentTime;
      onPositionChange(link.id, currentTime);
    }
  }, [link.id, onPositionChange]);

  // Sauvegarder la position périodiquement pendant la lecture
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && onPositionChange) {
      const currentTime = videoRef.current.currentTime;
      const now = Date.now();
      
      // Sauvegarder toutes les 5 secondes
      if (now - lastSaveTime.current >= 5000) {
        onPositionChange(link.id, currentTime);
        lastSaveTime.current = now;
      }
    }
  }, [link.id, onPositionChange]);

  // Sauvegarder la position avant de quitter la page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (videoRef.current && onPositionChange) {
        onPositionChange(link.id, videoRef.current.currentTime);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Sauvegarder aussi quand le composant est démonté
      if (videoRef.current && onPositionChange) {
        onPositionChange(link.id, videoRef.current.currentTime);
      }
    };
  }, [link.id, onPositionChange]);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove(link.id);
    } finally {
      setIsRemoving(false);
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
      window.open(link.url, '_blank', 'noopener,noreferrer');
      
      try {
        await incrementClickCount(link.id);
        setClicks(prev => prev + 1);
        if (fetchLinks) {
          await fetchLinks();
        }
      } catch (apiError) {
        console.error('Erreur server action, tentative avec fetch:', apiError);
        
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
          setClicks(prev => prev + 1);
        }
      }
      
    } catch (error) {
      console.error('Erreur:', error);
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
        {/* En-tête */}
        <div className="flex justify-between items-start mb-3 w-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-base truncate flex items-center gap-2">
                <Video className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="truncate">{link.title}</span>
              </h3>
              {link.pseudo && (
                <span className="badge badge-primary badge-sm flex-shrink-0">
                  {link.pseudo}
                </span>
              )}
            </div>
            
            {/* Description */}
            {showDescription && link.description && (
              <div className="mb-3">
                <div className="bg-base-200/50 dark:bg-base-800/30 p-3 rounded-lg border border-base-300">
                  <div className="text-sm text-base-content dark:text-base-content/90 break-words leading-relaxed whitespace-pre-wrap">
                    <LinkifyText text={link.description} />
                  </div>
                </div>
                
                {(() => {
                  const urlMatches = link.description.match(/(https?:\/\/[^\s]+)/g);
                  if (urlMatches && urlMatches.length > 0) {
                    return (
                      <div className="mt-1 text-xs opacity-70 flex items-center gap-1">
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          <span>{urlMatches.length} lien{urlMatches.length > 1 ? 's' : ''} dans la description</span>
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 ml-2">
            <button
              onClick={handleRemove}
              disabled={isRemoving}
              className="btn btn-ghost btn-xs btn-circle hover:btn-error text-base-content/50 hover:text-error transition-all"
              title="Supprimer la vidéo"
            >
              {isRemoving ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Player vidéo avec gestion de position */}
        <div className="relative rounded-lg overflow-hidden border border-base-300 mb-3 w-full">
          <div className="aspect-video bg-black">
            <video 
              ref={videoRef}
              src={link.url} 
              className="w-full h-full object-contain"
              controls
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={handlePause}
              onTimeUpdate={handleTimeUpdate}
              onError={(e) => {
                const target = e.target as HTMLVideoElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallbackDiv = document.createElement('div');
                  fallbackDiv.className = "w-full h-full flex flex-col items-center justify-center bg-base-200 p-4";
                  fallbackDiv.innerHTML = `
                    <div class="text-center mb-3">
                      <Video class="w-12 h-12 text-base-content/30 mx-auto mb-2" />
                      <p class="text-sm text-base-content/70 mb-2">Vidéo non disponible</p>
                    </div>
                    <button class="btn btn-xs btn-outline">
                      Télécharger la vidéo
                    </button>
                  `;
                  parent.appendChild(fallbackDiv);
                }
              }}
            />
          </div>
          <button
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all duration-300 group cursor-pointer"
            onClick={handleLinkClick}
            title="Ouvrir la vidéo"
            disabled={isLoadingClick}
          >
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center">
              <ExternalLink className="w-8 h-8 text-white mb-1" />
              <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">Ouvrir</span>
            </div>
          </button>
        </div>

        {/* Footer avec likes et actions */}
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
            <span className="badge badge-success badge-sm">Vidéo</span>
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

VideoCard.displayName = 'VideoCard';

// ImageCard existant
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

  const handleLinkClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isLoadingClick) return;
    
    setIsLoadingClick(true);
    
    try {
      window.open(link.url, '_blank', 'noopener,noreferrer');
      
      try {
        await incrementClickCount(link.id);
        setClicks(prev => prev + 1);
        if (fetchLinks) {
          await fetchLinks();
        }
      } catch (apiError) {
        console.error('Erreur server action, tentative avec fetch:', apiError);
        
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
          setClicks(prev => prev + 1);
        }
      }
      
    } catch (error) {
      console.error('Erreur:', error);
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
        {/* En-tête */}
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
            
            {/* Description */}
            {showDescription && link.description && (
              <div className="mb-3">
                <div className="bg-base-200/50 dark:bg-base-800/30 p-3 rounded-lg border border-base-300">
                  <div className="text-sm text-base-content dark:text-base-content/90 break-words leading-relaxed whitespace-pre-wrap">
                    <LinkifyText text={link.description} />
                  </div>
                </div>
                
                {(() => {
                  const urlMatches = link.description.match(/(https?:\/\/[^\s]+)/g);
                  if (urlMatches && urlMatches.length > 0) {
                    return (
                      <div className="mt-1 text-xs opacity-70 flex items-center gap-1">
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          <span>{urlMatches.length} lien{urlMatches.length > 1 ? 's' : ''} dans la description</span>
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
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

        {/* Footer avec likes et actions */}
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
  const [link, setLink] = useState<string>("");
  const [socialPseudo, setSocialPseudo] = useState<string>("");
  const [socialDescription, setSocialDescription] = useState<string>("");
  const [title, setTitle] = useState<string>(socialLinksData[0].name);
  const [links, setLinks] = useState<SocialLinkWithLikes[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // État pour stocker les positions des vidéos
  const [videoPositions, setVideoPositions] = useState<Record<string, number>>({});
  
  // États pour l'upload de fichier
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useFileUpload, setUseFileUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState<'single' | 'multiple'>('single');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger les positions sauvegardées depuis localStorage
  useEffect(() => {
    try {
      const savedPositions = localStorage.getItem('videoPositions');
      if (savedPositions) {
        setVideoPositions(JSON.parse(savedPositions));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des positions:', error);
    }
  }, []);

  // Sauvegarder les positions dans localStorage quand elles changent
  useEffect(() => {
    try {
      localStorage.setItem('videoPositions', JSON.stringify(videoPositions));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des positions:', error);
    }
  }, [videoPositions]);

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

  // Fonction pour sauvegarder la position d'une vidéo
  const handleVideoPositionChange = useCallback((linkId: string, position: number) => {
    setVideoPositions(prev => ({
      ...prev,
      [linkId]: position
    }));
  }, []);

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
    if (!["Image", "Document PDF", "Vidéo"].includes(title)) {
      setSelectedFiles([]);
      setUseFileUpload(false);
      setLink("");
    } else if (title === "Document PDF") {
      // Mode single pour PDF
      setUploadMode('single');
    } else if (title === "Vidéo") {
      // Mode single pour Vidéo
      setUploadMode('single');
    }
  }, [title]);

  // Gérer la sélection de fichiers
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Vérifier le type de fichier selon le titre sélectionné
    const invalidFiles = files.filter(file => {
      if (title === "Image" && !isImageFile(file)) return true;
      if (title === "Document PDF" && !isPDFFile(file)) return true;
      if (title === "Vidéo" && !isVideoFile(file)) return true;
      return false;
    });

    if (invalidFiles.length > 0) {
      toast.error(`Format de fichier non supporté. Utilisez ${title === "Image" ? "des images" : title === "Vidéo" ? "des vidéos" : "un PDF"}.`);
      return;
    }

    // Limite de taille (50MB pour vidéos, 10MB pour le reste)
    const oversizedFiles = files.filter(file => {
      const maxSize = title === "Vidéo" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      return file.size > maxSize;
    });
    
    if (oversizedFiles.length > 0) {
      const maxMB = title === "Vidéo" ? 50 : 10;
      toast.error(`Certains fichiers sont trop volumineux (max ${maxMB}MB chacun)`);
      return;
    }

    // Vérifier les formats vidéo supportés
    if (title === "Vidéo") {
      const unsupportedVideos = files.filter(file => 
        !SUPPORTED_VIDEO_FORMATS.includes(file.type)
      );
      if (unsupportedVideos.length > 0) {
        toast.error('Format vidéo non supporté. Utilisez MP4, WebM, OGG, MOV ou AVI.');
        return;
      }
    }

    // Limite du nombre de fichiers
    if (title === "Image" && uploadMode === 'multiple' && files.length + selectedFiles.length > 20) {
      toast.error(`Maximum 20 images autorisées`);
      return;
    }

    // Pour PDF et Vidéo, on ne garde qu'un seul fichier
    if (title === "Document PDF" || title === "Vidéo") {
      setSelectedFiles([files[0]]);
      setUploadMode('single');
    } else if (title === "Image") {
      // Pour les images, ajouter aux fichiers existants
      if (uploadMode === 'multiple') {
        setSelectedFiles(prev => [...prev, ...files].slice(0, 20));
      } else {
        setSelectedFiles([files[0]]);
      }
    }

    setUseFileUpload(true);
    setLink("");
  }, [title, uploadMode, selectedFiles]);

  // Upload des fichiers
  const handleFilesUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    let successfulUploads = 0;

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 200);

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('email', email);
        formData.append('title', title);
        formData.append('pseudo', socialPseudo);
        formData.append('description', socialDescription);
        if (selectedFiles.length > 1) {
          formData.append('index', i.toString());
          formData.append('total', selectedFiles.length.toString());
        }

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload du fichier ${i + 1} échoué`);
        }

        const data = await response.json();
        
        const newLink = await addSocialLink(
          email, 
          title, 
          data.url, 
          socialPseudo, 
          socialDescription
        );
        
        if (newLink) {
          successfulUploads++;
        }

        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }

      clearInterval(progressInterval);

      const modal = document.getElementById("social_links_form") as HTMLDialogElement;
      if (modal) modal.close();

      if (successfulUploads > 0) {
        await fetchLinks();
      }

      resetForm();
      
      if (selectedFiles.length > 1) {
        toast.success(`${successfulUploads} fichiers uploadés avec succès! 🎉`);
      } else {
        const typeLabel = title === "Vidéo" ? "Vidéo" : title;
        toast.success(`${typeLabel} ajouté(e) avec succès! 🎉`);
      }
      
      setTimeout(() => setUploadProgress(0), 1000);

    } catch (error) {
      console.error('Erreur upload:', error);
      if (successfulUploads > 0) {
        toast.error(`${successfulUploads} fichier(s) uploadé(s), ${selectedFiles.length - successfulUploads} échoué(s)`);
      } else {
        toast.error("Erreur lors de l'upload des fichiers");
      }
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, email, title, socialPseudo, socialDescription, fetchLinks]);

  // Réinitialiser le formulaire
  const resetForm = useCallback(() => {
    setLink("");
    setSocialPseudo("");
    setSocialDescription("");
    setTitle(socialLinksDataMemo[0].name);
    setSelectedFiles([]);
    setUseFileUpload(false);
    setUploadMode('single');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [socialLinksDataMemo]);

  const handleAddLink = useCallback(async () => {
    // Validation pour l'upload de fichier
    if (useFileUpload && selectedFiles.length > 0) {
      await handleFilesUpload();
      return;
    }

    // Validation pour les URLs normales
    if (!link || link.trim() === "") {
      const errorMsg = {
        "Image": "sélectionner une image",
        "Document PDF": "sélectionner un PDF",
        "Vidéo": "sélectionner une vidéo"
      }[title] || "entrer une URL";
      
      toast.error(`Veuillez ${errorMsg}`);
      return;
    }

    if (title !== "Image" && title !== "Document PDF" && title !== "Vidéo" && !isValidURL(link)) {
      toast.error("Veuillez entrer une URL valide");
      return;
    }

    if (!socialPseudo || socialPseudo.trim() === "") {
      toast.error("Veuillez entrer un pseudo");
      return;
    }

    // Validation spécifique pour les réseaux sociaux
    if (title !== "Image" && title !== "Document PDF" && title !== "Vidéo") {
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
      const newLink = await addSocialLink(email, title, link, socialPseudo, socialDescription);
      const modal = document.getElementById("social_links_form") as HTMLDialogElement;
      if (modal) modal.close();

      if (newLink) {
        await fetchLinks();
      }

      resetForm();
      toast.success("Lien ajouté avec succès! 🎉");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'ajout du lien");
    }
  }, [useFileUpload, selectedFiles, handleFilesUpload, link, title, socialPseudo, socialLinksDataMemo, email, fetchLinks, resetForm]);

  const handleRemoveLink = useCallback(async (linkId: string) => {
    try {
      await removeSocialLink(email, linkId);
      
      // Nettoyer la position de la vidéo supprimée
      setVideoPositions(prev => {
        const newPositions = { ...prev };
        delete newPositions[linkId];
        return newPositions;
      });
      
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

  // Statistiques par type de fichier
  const statsByType = useMemo(() => {
    const stats = {
      images: links.filter(link => isImageUrl(link.url)).length,
      videos: links.filter(link => isVideoUrl(link.url)).length,
      pdfs: links.filter(link => isPdfUrl(link.url)).length,
    };
    return stats;
  }, [links]);

  // Handlers memoïsés
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value || "");
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
    setSocialPseudo(e.target.value || "");
  }, []);

  const handleSocialDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSocialDescription(e.target.value || "");
  }, []);

  const handleLinkChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLink(e.target.value || "");
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

  // Supprimer un fichier spécifique
  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Supprimer tous les fichiers
  const handleRemoveAllFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  // Changer le mode d'upload
  const handleToggleUploadMode = useCallback(() => {
    if (title !== "Image") return;
    
    const newMode = uploadMode === 'single' ? 'multiple' : 'single';
    setUploadMode(newMode);
    
    if (newMode === 'single' && selectedFiles.length > 1) {
      setSelectedFiles(prev => prev.slice(0, 1));
    }
  }, [title, uploadMode, selectedFiles]);

  // Fonction pour déterminer le type de fichier
  const getFileType = useCallback(() => {
    if (title === "Image") return "image";
    if (title === "Vidéo") return "video";
    if (title === "Document PDF") return "pdf";
    return null;
  }, [title]);

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
    // Séparer les médias des autres liens
    const imageLinks = filteredLinks.filter(link => isImageUrl(link.url));
    const videoLinks = filteredLinks.filter(link => isVideoUrl(link.url));
    const otherLinks = filteredLinks.filter(link => 
      !isImageUrl(link.url) && !isVideoUrl(link.url) && !isPdfUrl(link.url)
    );
    const pdfLinks = filteredLinks.filter(link => isPdfUrl(link.url));

    return (
      <div className="space-y-6 w-full">
        {/* Section des vidéos */}
        {videoLinks.length > 0 && (
          <div className="space-y-4 w-full">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-success" />
              <h3 className="font-bold text-lg">Vidéos ({videoLinks.length})</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
              {videoLinks.map(link => (
                <div key={link.id} className="w-full">
                  <VideoCard
                    link={link}
                    onRemove={handleRemoveLink}
                    showDescription={showDescription}
                    fetchLinks={fetchLinks}
                    savedPosition={videoPositions[link.id]}
                    onPositionChange={handleVideoPositionChange}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Section des PDFs */}
        {pdfLinks.length > 0 && (
          <div className="space-y-4 w-full">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-error" />
              <h3 className="font-bold text-lg">PDFs ({pdfLinks.length})</h3>
            </div>
            <div className="flex flex-col gap-4 w-full">
              {pdfLinks.map(link => (
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

        {/* Section des autres liens */}
        {otherLinks.length > 0 && (
          <div className="space-y-4 w-full">
            {(imageLinks.length > 0 || videoLinks.length > 0 || pdfLinks.length > 0 || otherLinks.length > 0) && (
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
        {/* Colonne gauche */}
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

                {/* Sélecteur de thème */}
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
                   <div className="mt-6 w-full">
  <h3 className="text-sm font-medium text-base-content/70 mb-4">Statistiques par type</h3>
  
  <div className="grid grid-cols-2 gap-3">
    <div className="bg-base-100 border border-base-200 rounded-lg p-4 hover:bg-base-200 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-base-content/50 mb-1">Images</div>
          <div className="text-2xl font-bold">{statsByType.images}</div>
        </div>
        <div className="p-2 bg-primary/10 rounded-lg">
          <ImageIcon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
    
    <div className="bg-base-100 border border-base-200 rounded-lg p-4 hover:bg-base-200 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-base-content/50 mb-1">Vidéos</div>
          <div className="text-2xl font-bold">{statsByType.videos}</div>
        </div>
        <div className="p-2 bg-secondary/10 rounded-lg">
          <VideoIcon className="w-5 h-5 text-secondary" />
        </div>
      </div>
    </div>
    
    <div className="bg-base-100 border border-base-200 rounded-lg p-4 hover:bg-base-200 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-base-content/50 mb-1">PDFs</div>
          <div className="text-2xl font-bold">{statsByType.pdfs}</div>
        </div>
        <div className="p-2 bg-accent/10 rounded-lg">
          <FileIcon className="w-5 h-5 text-accent" />
        </div>
      </div>
    </div>
    
    <div className="bg-base-100 border border-base-200 rounded-lg p-4 hover:bg-base-200 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-base-content/50 mb-1">Liens décrits</div>
          <div className="text-2xl font-bold">{linksWithDescriptionCount}</div>
        </div>
        <div className="p-2 bg-info/10 rounded-lg">
          <LinkIcon className="w-5 h-5 text-info" />
        </div>
      </div>
    </div>
  </div>
</div>
                  )}
                </div>

                {/* Visualisation */}
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

        {/* Colonne droite */}
        <div className="lg:w-3/5 lg:h-full lg:overflow-y-auto lg:pl-3 w-full">
          <div className="space-y-6 lg:pb-8 w-full">
            {/* Barre de recherche et boutons */}
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

            {/* Modal */}
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
                          <option value="Vidéo">Vidéo</option>
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
                    
                    {/* Prévisualisation des liens dans la description */}
                    {socialDescription && (
                      <div className="mt-2">
                        <div className="text-xs font-medium mb-1">Aperçu des liens :</div>
                        <div className="bg-base-200/50 p-2 rounded text-sm">
                          <LinkifyText text={socialDescription} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section Upload ou URL */}
                  <div className="space-y-3 w-full">
                    <label className="label py-1 w-full">
                      <span className="label-text font-semibold">
                        {title === "Image" ? "Image" : 
                         title === "Vidéo" ? "Vidéo" : 
                         title === "Document PDF" ? "Document PDF" : "URL du lien"}
                      </span>
                    </label>

                    {/* Mode fichier pour Image/PDF/Vidéo */}
                    {(title === "Image" || title === "Vidéo" || title === "Document PDF") ? (
                      <div className="space-y-3 w-full">
                        {/* Bouton pour sélectionner le mode d'upload (uniquement pour les images) */}
                        {title === "Image" && (
                          <div className="flex items-center gap-2 mb-2">
                            <button
                              type="button"
                              className={`btn btn-xs ${uploadMode === 'single' ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => {
                                setUploadMode('single');
                                if (selectedFiles.length > 1) {
                                  setSelectedFiles(prev => prev.slice(0, 1));
                                }
                              }}
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              Une seule image
                            </button>
                            <button
                              type="button"
                              className={`btn btn-xs ${uploadMode === 'multiple' ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => setUploadMode('multiple')}
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              Plusieurs images
                            </button>
                          </div>
                        )}

                        {/* Input fichier avec accept dynamique */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={
                            title === "Image" ? "image/*" :
                            title === "Vidéo" ? "video/*" :
                            ".pdf"
                          }
                          onChange={handleFileChange}
                          className="file-input file-input-bordered file-input-sm w-full"
                          disabled={isUploading}
                          multiple={title === "Image" && uploadMode === 'multiple'}
                        />

                        {/* Aperçu des fichiers sélectionnés */}
                        {selectedFiles.length > 0 && (
                          <div className="mt-3 space-y-3 w-full">
                            {selectedFiles.length === 1 ? (
                              // Aperçu pour un seul fichier
                              <div className="bg-base-100 p-3 rounded-lg border border-base-300 w-full">
                                <div className="flex items-center justify-between mb-2 w-full">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {title === "Image" ? (
                                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                                        <ImageIcon className="w-4 h-4 text-blue-500" />
                                      </div>
                                    ) : title === "Vidéo" ? (
                                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                                        <Video className="w-4 h-4 text-green-500" />
                                      </div>
                                    ) : (
                                      <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 flex-shrink-0">
                                        <FileText className="w-4 h-4 text-red-500" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <span className="font-medium text-sm block truncate">
                                        {selectedFiles[0].name}
                                      </span>
                                      <span className="text-xs opacity-70">
                                        {(selectedFiles[0].size / 1024 / 1024).toFixed(2)} MB • {title}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={handleRemoveAllFiles}
                                    className="btn btn-ghost btn-xs flex-shrink-0"
                                    disabled={isUploading}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Prévisualisation pour un seul fichier */}
                                <div className="mt-3 w-full">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-medium">Prévisualisation :</span>
                                  </div>
                                  <FilePreview 
                                    file={selectedFiles[0]} 
                                    type={getFileType() as 'image' | 'pdf' | 'video'} 
                                  />
                                </div>
                              </div>
                            ) : (
                              // Aperçu pour plusieurs fichiers
                              <MultipleFilesPreview 
                                files={selectedFiles}
                                onRemove={handleRemoveFile}
                                fileType={title === "Image" ? "image" : "video"}
                              />
                            )}

                            {/* Informations sur le multi-upload */}
                            {selectedFiles.length > 1 && (
                              <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-info mb-1">
                                  <Info className="w-4 h-4" />
                                  <span className="font-medium text-sm">Upload multiple activé</span>
                                </div>
                                <p className="text-xs text-info/80">
                                  {selectedFiles.length} fichiers seront uploadés en une seule fois.
                                  La description sera appliquée à tous les fichiers.
                                </p>
                              </div>
                            )}

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
                        (title !== "Image" && title !== "Vidéo" && title !== "Document PDF" && !link) ||
                        ((title === "Image" || title === "Vidéo" || title === "Document PDF") && selectedFiles.length === 0)
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
                          <span className="text-sm">
                            {selectedFiles.length > 1 ? `Ajouter ${selectedFiles.length} fichiers` : 'Ajouter le lien'}
                          </span>
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