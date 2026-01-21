"use client";

import Link from "next/link";
import Wrapper from "./components/Wrapper";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useRef, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import { addSocialLink, getSocialLinksWithLikes, getUserInfo, removeSocialLink, updateUserTheme } from "./server";
import { Copy, ExternalLink, Palette, Plus, Search, Eye, EyeOff, Upload, FileText, Image as ImageIcon, X, Download, File, Heart, Users, ArrowRight, Sparkles } from "lucide-react";
import socialLinksData from "./socialLinksData";
import { SocialLink } from "@prisma/client";
import EmptyState from "./components/EmptyState";
import LinkComponent from "./components/LinkComponent";
import Visualisation from "./components/Visualisation";

const truncateLink = (url: string, maxLenght = 20) => {
  return url.length > maxLenght
    ? url.substring(0, maxLenght) + "..."
    : url;
};

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

// Composant de prévisualisation pour fichiers
const FilePreview = ({ file, type }: { file: File, type: 'image' | 'pdf' }) => {
  if (type === 'image') {
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-base-300">
        <img 
          src={URL.createObjectURL(file)} 
          alt="Aperçu de l'image"
          className="w-full h-full object-contain"
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
};

// Composant de prévisualisation pour URL
const UrlPreview = ({ url }: { url: string }) => {
  const [previewType, setPreviewType] = useState<'none' | 'youtube' | 'image' | 'pdf'>('none');
  
  useEffect(() => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      setPreviewType('youtube');
    } else if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
      setPreviewType('image');
    } else if (url.match(/\.pdf$/i)) {
      setPreviewType('pdf');
    } else {
      setPreviewType('none');
    }
  }, [url]);

  const getYoutubeVideoId = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname.includes("youtu.be")) {
        return parsedUrl.pathname.slice(1);
      }
      if (parsedUrl.searchParams.get("v")) {
        return parsedUrl.searchParams.get("v");
      }
      return null;
    } catch {
      return null;
    }
  };

  if (previewType === 'youtube') {
    const videoId = getYoutubeVideoId(url);
    if (!videoId) return null;

    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-base-300">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title="Prévisualisation YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />     
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
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
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
};

interface SocialLinkWithLikes extends SocialLink {
  likesCount?: number;
  isLikedByCurrentUser?: boolean;
}

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
  const [filteredLinks, setFilteredLinks] = useState<SocialLinkWithLikes[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // États pour l'upload de fichier
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useFileUpload, setUseFileUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const themes = [
    "light", "dark", "cupcake", "bumblebee", "emerald", "corporate", "synthwave", "retro",
    "cyberpunk", "caramellatte", "halloween", "garden", "forest", "aqua", "lofi", "pastel",
    "fantasy", "wireframe", "black", "luxury", "dracula", "cmyk", "autumn", "business",
    "acid", "lemonade", "coffee", "winter", "dim", "nord", "sunset", "valentine", "abyss", "silk"
  ];

  // Fonction pour rafraîchir les liens (avec useCallback pour éviter des re-renders inutiles)
  const fetchLinks = useCallback(async () => {
    try {
      const userInfo = await getUserInfo(email);
      if (userInfo) {
        setPseudo(userInfo.pseudo);
        setTheme(userInfo.theme);
        setTheme2(userInfo.theme)
      }

      // Utiliser la nouvelle fonction qui inclut les likes
      const fetchedLinks = await getSocialLinksWithLikes(email, currentUserId);
      if (fetchedLinks) {
        setLinks(fetchedLinks);
        setFilteredLinks(fetchedLinks);
      }
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors du fetch des liens:", error);
      toast.error("Impossible de récupérer les données");
    }
  }, [email, currentUserId]);

  // Filtrer les liens en fonction de la recherche
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredLinks(links);
    } else {
      const filtered = links.filter(link => {
        const url = link.url || "";
        const description = link.description || "";
        
        return (
          (link.title && link.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (link.pseudo && link.pseudo.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (url.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (description.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      });
      setFilteredLinks(filtered);
    }
  }, [searchQuery, links]);

  // Réinitialiser les états du fichier quand on change de type
  useEffect(() => {
    if (title !== "Image" && title !== "Document PDF") {
      setSelectedFile(null);
      setUseFileUpload(false);
      setLink("");
    }
  }, [title]);

  // Gérer la sélection de fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  // Upload du fichier
  const handleFileUpload = async () => {
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
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setLink("");
    setSocialPseudo("");
    setSocialDescription("");
    setTitle(socialLinksData[0].name);
    setSelectedFile(null);
    setUseFileUpload(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddLink = async () => {
    // Validation pour l'upload de fichier
    if (useFileUpload && selectedFile) {
      await handleFileUpload();
      return;
    }

    // Validation pour les URLs normales
    if (!link) {
      toast.error(`Veuillez ${title === "Image" ? "sélectionner une image" : title === "Document PDF" ? "sélectionner un PDF" : "entrer une URL"}`);
      return;
    }

    if (title !== "Image" && title !== "Document PDF" && !isValidURL(link)) {
      toast.error("Veuillez entrer une URL valide");
      return;
    }

    if (!socialPseudo) {
      toast.error("Veuillez entrer un pseudo");
      return;
    }

    // Validation spécifique pour les réseaux sociaux
    if (title !== "Image" && title !== "Document PDF") {
      const selectedTitle = socialLinksData.find(l => l.name === title);
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
  };

  // Fonction pour uploader le fichier et retourner l'URL
  const uploadFile = async (): Promise<string> => {
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
  };

  const handleRemoveLink = async (linkId: string) => {
    try {
      await removeSocialLink(email, linkId);
      // Rafraîchir les liens après la suppression
      await fetchLinks();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression");
    }
  };

  // Fonction pour rafraîchir les liens (à passer aux composants enfants)
  const handleRefreshLinks = async () => {
    await fetchLinks();
  };

  useEffect(() => {
    if (email) {
      fetchLinks();
    }
  }, [email, fetchLinks]); // Ajout de fetchLinks dans les dépendances

  const copyToClipboard = () => {
    if (!pseudo) return;

    const url = `yolinkify.vercel.app/page/${pseudo}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Lien copié"))
      .catch(err => console.error("Erreur lors de la copie :", err));
  };

  const handleConfirmTheme = async () =>{
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
  }

  // Calculer le total des likes
  const totalLikes = links.reduce((total, link) => total + (link.likesCount || 0), 0);

  return (
    <Wrapper>
      <Toaster position="top-right" reverseOrder={false} />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3">
          {/* En-tête optimisé */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-base-200 to-base-200 p-5 rounded-2xl border border-base-300 shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/20 to-transparent rounded-full -translate-y-12 translate-x-6"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 relative z-10">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 
                     rounded-full secondary
                     text-error font-semibold text-sm
                     shadow hover:shadow-md transition-shadow duration-300">
                    <Sparkles className="w-4 h-4" />
                    <span>Ta page est prête 😎</span>
                  </div>

                  {pseudo && (
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/page/${pseudo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group hidden lg:flex items-center gap-2
                                 px-4 py-2 rounded-xl
                                 font-semibold text-sm
                                 bg-gradient-to-r from-base-100 to-base-200 
                                 text-base-content border border-base-300
                                 hover:from-primary hover:to-secondary
                                 hover:text-white hover:border-primary
                                 transition-all duration-200 ease-out
                                 shadow-sm hover:shadow
                                 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-1">
                          <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                          <span className="text-primary font-bold group-hover:text-white transition-colors">
                            {pseudo}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 ml-1 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    </div>
                  )}
                </div>

                {pseudo && (
                  <Link
                    href={`/page/${pseudo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lg:hidden flex items-center gap-1.5 text-primary hover:text-secondary font-medium text-sm transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{truncateLink(`/page/${pseudo}`, 25)}</span>
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Badge des likes optimisé */}
                {totalLikes > 0 && (
                  <div className="tooltip tooltip-bottom" data-tip={`Total des likes: ${totalLikes}`}>
                    <div className="flex items-center gap-1">
                      {/* Version mobile */}
                      <div className="lg:hidden badge badge-primary gap-1.5 px-2.5 py-1.5 min-h-0 h-auto shadow-sm">
                        <Heart className="w-3.5 h-3.5 fill-current" />
                        <span className="text-xs font-bold">{totalLikes}</span>
                      </div>
                      {/* Version desktop optimisée */}
                      <div className="hidden lg:flex items-center gap-2 px-3 py-2 
                           rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 
                           border border-primary/20 shadow-sm
                           hover:from-primary/20 hover:to-secondary/20 transition-all">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1.5 rounded-full bg-primary/10">
                            <Heart className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-xs font-semibold text-base-content">{totalLikes}</span>
                            <span className="text-[10px] opacity-70">Likes</span>
                          </div>
                        </div>
                        <div className="h-6 w-px bg-base-300 mx-0.5"></div>
                        <div className="flex items-center gap-1.5">
                          <div className="p-1.5 rounded-full bg-secondary/10">
                            <Users className="w-4 h-4 text-secondary" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-xs font-semibold text-base-content">{links.length}</span>
                            <span className="text-[10px] opacity-70">Liens</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-sm btn-ghost hover:btn-primary transition-all duration-200 group"
                  onClick={copyToClipboard}
                  disabled={!pseudo}
                >
                  <Copy className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline text-xs">Copier</span>
                  <span className="sm:hidden">📋</span>
                </button>
              </div>
            </div>
          </div>

          {/* Barre de recherche et boutons optimisés */}
          <div className="flex flex-col lg:flex-row gap-3 my-5">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-base-content/60" />
              </div>
              <input
                type="text"
                placeholder="Rechercher un lien..."
                className="input input-bordered w-full pl-10 pr-10 py-2 text-sm
                         focus:ring-1 focus:ring-primary/20 focus:border-primary
                         transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="absolute inset-y-0 right-0 pr-3 flex items-center 
                           hover:scale-110 transition-transform"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4 text-base-content/40 hover:text-base-content" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                className="btn btn-sm btn-error flex items-center gap-2 text-amber-50
                         hover:btn-primary transition-all duration-200 group"
                onClick={() => setShowDescription(!showDescription)}
              >
                {showDescription ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    <span className="hidden lg:inline text-xs">Cacher</span>
                    <span className="lg:hidden">Cacher</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    <span className="hidden lg:inline text-xs">Afficher</span>
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
                onClick={() =>
                  (document.getElementById("social_links_form") as HTMLDialogElement).showModal()
                }
              >
                <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                <span className="hidden lg:inline text-xs">Nouveau lien</span>
                <span className="lg:hidden text-xs">Ajouter</span>
              </button>
            </div>
          </div>

          {/* Modal optimisé */}
          <dialog id="social_links_form" className="modal modal-middle">
            <div className="modal-box max-w-2xl p-0 overflow-hidden">
              <div className="bg-amber-400 p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xl text-white">Nouveau lien</h3>
                    <p className="text-white/80 text-xs mt-1">Ajouter vos liens publics</p>
                  </div>
                  <form method="dialog " className="bg-amber-300" style={{borderRadius: "10px"}}>
                    <button className="btn btn-xs btn-circle btn-ghost text-white  bg-danger hover:bg-white/20">
                      ✕
                    </button>
                  </form>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text font-semibold">Type de contenu</span>
                    </label>
                    <select
                      className="select select-bordered select-sm w-full focus:ring-1 focus:ring-primary/20"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    >
                      <optgroup label="Réseaux sociaux">
                        {socialLinksData.map(({ name }) => (
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

                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text font-semibold">Pseudo / Nom</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Votre pseudo ou nom"
                      className="input input-bordered input-sm w-full focus:ring-1 focus:ring-primary/20"
                      value={socialPseudo}
                      onChange={(e) => setSocialPseudo(e.target.value)}
                    />
                  </div>
                </div>

                {/* Champ Description */}
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text font-semibold">Description</span>
                    <span className="label-text-alt text-xs">(Optionnel)</span>
                  </label>
                  <textarea
                    placeholder="Entrez une description pour votre lien..."
                    className="textarea textarea-bordered textarea-sm w-full h-20 focus:ring-1 focus:ring-primary/20"
                    value={socialDescription || ""}
                    onChange={(e) => setSocialDescription(e.target.value)}
                  />
                </div>

                {/* Section Upload ou URL */}
                <div className="space-y-3">
                  <label className="label py-1">
                    <span className="label-text font-semibold">
                      {title === "Image" ? "Image" : title === "Document PDF" ? "Document PDF" : "URL du lien"}
                    </span>
                  </label>

                  {/* Mode fichier pour Image/PDF */}
                  {(title === "Image" || title === "Document PDF") ? (
                    <div className="space-y-3">
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
                        <div className="space-y-3">
                          <div className="bg-base-100 p-3 rounded-lg border border-base-300">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {title === "Image" ? (
                                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                    <ImageIcon className="w-4 h-4 text-blue-500" />
                                  </div>
                                ) : (
                                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                                    <FileText className="w-4 h-4 text-red-500" />
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium text-sm block">
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
                                className="btn btn-ghost btn-xs"
                                disabled={isUploading}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Prévisualisation */}
                            <div className="mt-3">
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
                            <div className="mt-3">
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
                    <div className="space-y-3">
                      <input
                        type="url"
                        placeholder="https://..."
                        className="input input-bordered input-sm w-full focus:ring-1 focus:ring-primary/20"
                        value={link || ""}
                        onChange={(e) => setLink(e.target.value)}
                      />
                      
                      {/* Prévisualisation pour l'URL */}
                      {link && (
                        <div className="bg-base-100 p-3 rounded-lg border border-base-300">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">Prévisualisation :</span>
                          </div>
                          <UrlPreview url={link} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bouton d'ajout */}
                <div className="flex gap-3 pt-4">
                  <button
                    className="btn btn-sm btn-ghost flex-1 hover:btn-error transition-all"
                    onClick={() => {
                      const modal = document.getElementById("social_links_form") as HTMLDialogElement;
                      if (modal) modal.close();
                      resetForm();
                    }}
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
          </dialog>

          {loading ? (
            <div className="my-8 flex justify-center items-center w-full">
              <div className="flex flex-col items-center gap-2">
                <span className="loading loading-spinner loading-md text-primary"></span>
                <p className="text-sm text-base-content/70">Chargement...</p>
              </div>
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full py-8 bg-base-100 rounded-xl border border-dashed border-base-300">
              <EmptyState IconComponent={"Cable"} message={
                searchQuery ? 
                "Aucun lien ne correspond à votre recherche 😭" : 
                "Aucun lien disponible ! 😭"
              } />
              {searchQuery && (
                <button
                  className="btn btn-sm btn-outline mt-3 hover:btn-primary transition-all"
                  onClick={() => setSearchQuery("")}
                >
                  Effacer la recherche
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredLinks.map(link => (
                <LinkComponent
                  key={link.id}
                  socialLink={link}
                  onRemove={handleRemoveLink}
                  readonly={false}
                  fetchLinks={handleRefreshLinks}
                  showDescription={showDescription}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar optimisée */}
        <div className="lg:w-1/3">
          {pseudo && theme && (
            <div className="sticky top-4 space-y-4">
              {/* Sélecteur de thème optimisé */}
              <div className="bg-base-100 rounded-xl p-4 border border-base-300 shadow-sm">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
                  <div className="flex-grow">
                    <label className="label py-0">
                      <span className="label-text font-semibold">Thème de votre page</span>
                    </label>
                    <select
                      className="select select-bordered select-sm w-full focus:ring-1 focus:ring-primary/20"
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
                    className={`btn btn-sm ${theme === theme2 ? 'btn-disabled bg-base-300' : 'btn-primary'} 
                             flex items-center justify-center gap-0 min-w-[100px]
                             bg-primary
                             hover:from-primary/90 hover:to-secondary/90
                             border-none shadow-sm hover:shadow
                             hover:-translate-y-0.5 transition-all duration-200`}
                    disabled={theme === theme2}
                    title={theme === theme2 ? "Thème déjà appliqué" : "Appliquer le thème"}
                    onClick={handleConfirmTheme}
                  >
                    <Palette className="w-2.5 h-2.5 text-amber-50" />
                    <span className="text-xs text-amber-50">Appliquer</span>
                  </button>
                </div>
              </div>

              {/* Stats des likes optimisées */}
              {totalLikes > 0 && (
                <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-xl p-4 border border-base-300 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Heart className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Statistiques</h3>
                      <p className="text-xs text-base-content/70">Engagement de votre page</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="stat bg-base-200 rounded-lg p-2">
                      <div className="stat-figure text-primary">
                        <Heart className="w-5 h-5" />
                      </div>
                      <div className="stat-title text-xs">Total des likes</div>
                      <div className="stat-value text-xl">{totalLikes}</div>
                      <div className="stat-desc text-xs">sur {links.length} liens</div>
                    </div>
                    
                    <div className="stat bg-base-200 rounded-lg p-2">
                      <div className="stat-figure text-secondary">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="stat-title text-xs">Liens actifs</div>
                      <div className="stat-value text-xl">{links.length}</div>
                      <div className="stat-desc text-xs">Publics et visibles</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Visualisation */}
              <div className="bg-base-100 rounded-xl p-4 border border-base-300 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-md bg-gradient-to-r from-primary/10 to-secondary/10">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Prévisualisation</h3>
                    <p className="text-xs text-base-content/70">Votre page publique</p>
                  </div>
                </div>
                <Visualisation
                  socialLinks={links}
                  pseudo={pseudo}
                  theme={theme || "retro"}
                />
              </div>

              {/* Bouton vers la page publique optimisé */}
              <Link
                href={`/page/${pseudo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="btn btn-sm w-full bg-error
                           
                           hover:from-primary/90 hover:to-secondary/90
                           border-none text-white font-semibold
                           shadow hover:shadow-md
                           hover:-translate-y-0.5 transition-all duration-200
                           transform flex items-center justify-center gap-2">
                  <span className="text-sm ">Voir ma page</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
}