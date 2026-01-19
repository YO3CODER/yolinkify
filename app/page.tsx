"use client";

import Link from "next/link";
import Wrapper from "./components/Wrapper";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { addSocialLink, getSocialLinks, getUserInfo, removeSocialLink, updateUserTheme } from "./server";
import { Copy, ExternalLink, Palette, Plus, Search, Eye, EyeOff, Upload, FileText, Image as ImageIcon, X, Download, File } from "lucide-react";
import socialLinksData from "./socialLinksData";
import { SocialLink } from "@prisma/client";
import EmptyState from "./components/EmptyState";
import LinkComponent from "./components/LinkComponent";
import error from "next/error";
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
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3">
          <div className="flex items-center gap-2 text-white">
            <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
              <span className="text-xs font-bold">▶</span>
            </div>
            <span className="text-sm font-medium">Vidéo YouTube</span>
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

export default function Home() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress as string;

  const [pseudo, setPseudo] = useState<string | null | undefined>(null);
  const [theme, setTheme] = useState<string | null | undefined>(null);
  const [theme2, setTheme2] = useState<string | null | undefined>(null);
  const [link, setLink] = useState<string>("");
  const [socialPseudo, setSocialPseudo] = useState<string>("");
  const [socialDescription, setSocialDescription] = useState<string>("");
  const [title, setTitle] = useState<string>(socialLinksData[0].name);
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<SocialLink[]>([]);
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
        setLinks([...links, newLink]);
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
        setLinks([...links, newLink]);
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
      setLinks(links.filter(link => link.id !== linkId));
      toast.success("Lien supprimé");
    } catch {
      console.error(error);
      toast.error("Erreur lors de la suppression");
    }
  };

  async function fetchLinks() {
    try {
      const userInfo = await getUserInfo(email);
      if (userInfo) {
        setPseudo(userInfo.pseudo);
        setTheme(userInfo.theme);
        setTheme2(userInfo.theme)
      }

      const fetchedLinks = await getSocialLinks(email);
      if (fetchedLinks) {
        setLinks(fetchedLinks);
        setFilteredLinks(fetchedLinks);
      }
      setLoading(false);
    } catch (error) {
      toast.error("Impossible de récupérer les données");
    }
  }

  useEffect(() => {
    if (email) {
      fetchLinks();
    }
  }, [email]);

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

  return (
    <Wrapper>
      <Toaster position="top-right" reverseOrder={false} />

      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-2/3">
          <div className="flex justify-between items-center bg-base-200 p-5 rounded-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-4 py-2 
                 rounded-full bg-gradient-to-r from-blue-200 to-blue-500
                 text-white font-semibold text-sm
                 shadow-md ">
                🔥 Ta page est prête 😎
              </span>

              {pseudo && (
                <Link
                  href={`/page/${pseudo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:flex items-center gap-2
                           px-4 py-2 rounded-xl
                           font-bold text-sm
                           bg-base-200 text-base-content
                           hover:text-white
                           transition-all duration-300
                           shadow-sm hover:shadow-md"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-primary font-extrabold">{pseudo}</span>
                </Link>
              )}

              {pseudo && (
                <Link
                  href={`/page/${pseudo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link md:hidden flex font-bold"
                >
                  {truncateLink(`/page/${pseudo}`)}
                </Link>
              )}
            </div>

            <button
              className="btn btn-sm-ghost"
              onClick={copyToClipboard}
              disabled={!pseudo}
            >
              <Copy className="w-4 h-4" />
              Copie
            </button>
          </div>

          {/* Barre de recherche et bouton pour afficher/cacher la description */}
          <div className="flex flex-col sm:flex-row gap-3 my-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher un lien par titre, pseudo, URL ou description..."
                className="input input-bordered w-full pl-10 pr-4 py-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setSearchQuery("")}
                >
                  <span className="text-gray-400 hover:text-gray-600">✕</span>
                </button>
              )}
            </div>

            <button
              className="btn btn-sm flex items-center gap-2"
              onClick={() => setShowDescription(!showDescription)}
            >
              {showDescription ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Cacher description
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Afficher description
                </>
              )}
            </button>

            <button
              className="btn btn-sm btn-primary flex items-center gap-2"
              onClick={() =>
                (document.getElementById("social_links_form") as HTMLDialogElement).showModal()
              }
            >
              <Plus className="w-4 h-4" />
              Ajouter lien
            </button>
          </div>

          {/* Modal pour ajouter un lien */}
          <dialog id="social_links_form" className="modal">
            <div className="modal-box max-w-2xl">
              <form method="dialog">
                <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                  ✕
                </button>
              </form>

              <h3 className="font-bold text-lg mb-2">Nouveau lien</h3>
              <p className="text-sm opacity-70 mb-6">Ajouter vos liens publics</p>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Type de contenu</span>
                    </label>
                    <select
                      className="select select-bordered w-full"
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
                    <label className="label">
                      <span className="label-text font-semibold">Pseudo / Nom</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Votre pseudo ou nom"
                      className="input input-bordered w-full"
                      value={socialPseudo}
                      onChange={(e) => setSocialPseudo(e.target.value)}
                    />
                  </div>
                </div>

                {/* Champ Description */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Description</span>
                    <span className="label-text-alt">(Optionnel)</span>
                  </label>
                  <textarea
                    placeholder="Entrez une description pour votre lien..."
                    className="textarea textarea-bordered w-full h-24"
                    value={socialDescription || ""} // CORRECTION : valeur par défaut
                    onChange={(e) => setSocialDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Section Upload ou URL */}
                <div className="space-y-4">
                  <label className="label">
                    <span className="label-text font-semibold">
                      {title === "Image" ? "Image" : title === "Document PDF" ? "Document PDF" : "URL du lien"}
                    </span>
                  </label>

                  {/* Mode fichier pour Image/PDF */}
                  {(title === "Image" || title === "Document PDF") ? (
                    <div className="space-y-4">
                      {/* Input fichier */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={title === "Image" ? "image/*" : ".pdf"}
                        onChange={handleFileChange}
                        className="file-input file-input-bordered w-full"
                        disabled={isUploading}
                      />

                      {/* Aperçu du fichier sélectionné */}
                      {selectedFile && (
                        <div className="space-y-4">
                          <div className="bg-base-100 p-4 rounded-xl border border-base-300">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                {title === "Image" ? (
                                  <ImageIcon className="w-6 h-6 text-blue-500" />
                                ) : (
                                  <FileText className="w-6 h-6 text-red-500" />
                                )}
                                <div>
                                  <span className="font-medium truncate block">
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
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Prévisualisation */}
                            <div className="mt-4">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm font-semibold">Prévisualisation :</span>
                              </div>
                              <FilePreview 
                                file={selectedFile} 
                                type={title === "Image" ? "image" : "pdf"} 
                              />
                            </div>
                          </div>

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
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Mode URL pour réseaux sociaux */
                    <div className="space-y-4">
                      <input
                        type="url"
                        placeholder="https://..."
                        className="input input-bordered w-full"
                        value={link || ""} // CORRECTION : valeur par défaut
                        onChange={(e) => setLink(e.target.value)}
                      />
                      
                      {/* Prévisualisation pour l'URL */}
                      {link && (
                        <div className="bg-base-100 p-4 rounded-xl border border-base-300">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-semibold">Prévisualisation :</span>
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
                    className="btn btn-ghost flex-1"
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
                    className="btn btn-primary flex-1 gap-2"
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
                        <span className="loading loading-spinner loading-sm"></span>
                        Upload...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Ajouter le lien
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </dialog>

          {loading ? (
            <div className="my-10 flex justify-center items-center w-full">
              <span className="loading loading-spinner loading-lg text-accent"></span>
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full py-10">
              <EmptyState IconComponent={"Cable"} message={
                searchQuery ? 
                "Aucun lien ne correspond à votre recherche 😭" : 
                "Aucun lien disponible ! 😭"
              } />
              {searchQuery && (
                <button
                  className="btn btn-sm btn-outline mt-4"
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
                  fetchLinks={fetchLinks}
                  showDescription={showDescription}
                />
              ))}
            </div>
          )}
        </div>

        <div className="md:w-1/3">
          {pseudo && theme && (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4 gap-2">
                <select
                  className="select select-bordered w-full"
                  value={theme || ""} // CORRECTION : valeur par défaut
                  onChange={(e) => setTheme(e.target.value)}
                >
                  {themes.map(themeOption => (
                    <option key={themeOption} value={themeOption}>
                      {themeOption}
                    </option>
                  ))}
                </select>

                <button
                  className={`btn ${theme === theme2 ? 'btn-disabled' : 'btn-accent'} flex items-center justify-center`}
                  disabled={theme === theme2}
                  title={theme === theme2 ? "Thème déjà appliqué" : "Appliquer le thème"}
                  onClick={handleConfirmTheme}
                >
                  <Palette className="w-4 h-4" />
                </button>
              </div>

              <Visualisation
                socialLinks={links}
                pseudo={pseudo}
                theme={theme || "retro"} // CORRECTION : valeur par défaut
              />
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
}