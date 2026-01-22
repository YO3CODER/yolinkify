"use client";

import Link from "next/link";
import Wrapper from "./components/Wrapper";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useRef, useCallback, memo, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import { addSocialLink, getSocialLinksWithLikes, getUserInfo, removeSocialLink, updateUserTheme } from "./server";
import { Copy, ExternalLink, Palette, Plus, Search, Eye, EyeOff, Upload, FileText, Image as ImageIcon, X, Download, File, Heart, Users, ArrowRight, Sparkles } from "lucide-react";
import socialLinksData from "./socialLinksData";
import { SocialLink } from "@prisma/client";
import EmptyState from "./components/EmptyState";
import LinkComponent from "./components/LinkComponent";
import Visualisation from "./components/Visualisation";

// Mémoïsation de la fonction de troncature
const truncateLink = (url: string, maxLength = 20) => {
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

  const getYoutubeVideoId = useCallback((url: string): string | null => {
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
  }, []);

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
          loading="lazy"
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
          loading="lazy"
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
      setLink("");
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
    setLink("");
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

  // Fonction pour rafraîchir les liens
  const handleRefreshLinks = useCallback(async () => {
    await fetchLinks();
  }, [fetchLinks]);

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
    setSearchQuery(e.target.value);
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
    setSocialPseudo(e.target.value);
  }, []);

  const handleSocialDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSocialDescription(e.target.value);
  }, []);

  const handleLinkChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLink(e.target.value);
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

  const renderLinksList = () => (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
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
  );

  return (
    <Wrapper>
      <Toaster position="top-right" reverseOrder={false} />

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-5rem)]">
        {/* Colonne gauche - Agrandie (35%) avec scroll indépendant */}
        <div className="lg:w-2/5 lg:h-full lg:overflow-y-auto lg:pr-3">
          <div className="space-y-6 lg:pb-8">
            {pseudo && theme && (
              <div className="space-y-6">
                {/* En-tête dans la sidebar */}
                <div className="bg-gradient-to-br from-primary/10 via-base-200 to-base-200 rounded-2xl p-5 border border-base-300 shadow-sm">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h2 className="font-bold text-lg">Tableau de bord</h2>
                    </div>
                    
                    <div className="text-center">
                      <h1 className="text-xl font-bold">{pseudo}</h1>
                      <p className="text-sm opacity-70 mt-1">Gérez votre page de liens</p>
                    </div>
                  </div>
                </div>

                {/* Sélecteur de thème amélioré */}
                <div className="bg-base-100 rounded-2xl p-5 border border-base-300 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Palette className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-lg">Personnalisation</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
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
                <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-2xl p-5 border border-base-300 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <Heart className="w-6 h-6 text-primary" />
                    <div>
                      <h3 className="font-bold text-lg">Statistiques</h3>
                      <p className="text-sm text-base-content/70">Engagement de votre page</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-base-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Heart className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="stat-value text-2xl">{totalLikes}</div>
                          <div className="stat-title text-sm">Total des likes</div>
                        </div>
                      </div>
                      <div className="text-xs opacity-70">sur {links.length} liens</div>
                    </div>
                    
                    <div className="bg-base-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-secondary/10">
                          <Users className="w-5 h-5 text-secondary" />
                        </div>
                        <div>
                          <div className="stat-value text-2xl">{links.length}</div>
                          <div className="stat-title text-sm">Liens actifs</div>
                        </div>
                      </div>
                      <div className="text-xs opacity-70">Publics et visibles</div>
                    </div>
                  </div>
                  
                  {links.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-base-300">
                      <div className="flex items-center justify-between text-sm">
                        <span className="opacity-70">Liens avec description:</span>
                        <span className="font-semibold">
                          {linksWithDescriptionCount}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visualisation améliorée */}
                <div className="bg-base-100 rounded-2xl p-5 border border-base-300 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="font-bold text-lg">Aperçu instantané</h3>
                      <p className="text-sm text-base-content/70">Votre page publique</p>
                    </div>
                  </div>
                  <Visualisation
                    socialLinks={links}
                    pseudo={pseudo}
                    theme={theme || "retro"}
                  />
                  
                  <div className="mt-4 pt-4 border-t border-base-300">
                    <Link
                      href={`/page/${pseudo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
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
                <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-2xl p-5 border border-base-300 shadow-sm">
                  <div className="flex flex-col items-center space-y-3">
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
        <div className="lg:w-3/5 lg:h-full lg:overflow-y-auto lg:pl-3">
          <div className="space-y-6 lg:pb-8">
            {/* Barre de recherche et boutons optimisés */}
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-grow">
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

              <div className="flex gap-2">
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

            {/* Modal optimisé */}
            <dialog id="social_links_form" className="modal modal-middle">
              <div className="modal-box max-w-2xl p-0 overflow-hidden">
                <div className="bg-amber-400 p-4">
                  <div className="flex justify-between items-center">
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

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="form-control">
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

                    <div className="form-control">
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
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text font-semibold">Description</span>
                      <span className="label-text-alt text-xs">(Optionnel)</span>
                    </label>
                    <textarea
                      placeholder="Entrez une description pour votre lien..."
                      className="textarea textarea-bordered textarea-sm w-full h-20 focus:ring-1 focus:ring-primary/20"
                      value={socialDescription || ""}
                      onChange={handleSocialDescriptionChange}
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
                          onChange={handleLinkChange}
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
            </dialog>

            {loading ? renderLoading() : 
             filteredLinks.length === 0 ? renderEmptyState() : renderLinksList()}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}