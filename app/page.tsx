"use client";

import Link from "next/link";
import Wrapper from "./components/Wrapper";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { addSocialLink, getSocialLinks, getUserInfo, removeSocialLink, updateUserTheme } from "./server";
import { Copy, ExternalLink, Palette, Plus } from "lucide-react";
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

export default function Home() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress as string;

  const [pseudo, setPseudo] = useState<string | null | undefined>(null);
  const [theme, setTheme] = useState<string | null | undefined>(null);
  const [theme2, setTheme2] = useState<string | null | undefined>(null);
  const [link, setLink] = useState<string>("");
  const [socialPseudo, setSocialPseudo] = useState<string>("");
  const [socialDescription, setSocialDescription] = useState<string>(""); // État pour la description
  const [title, setTitle] = useState<string>(socialLinksData[0].name);
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const themes = [
    "light",
    "dark",
    "cupcake",
    "bumblebee",
    "emerald",
    "corporate",
    "synthwave",
    "retro",
    "cyberpunk",
    "caramellatte",
    "halloween",
    "garden",
    "forest",
    "aqua",
    "lofi",
    "pastel",
    "fantasy",
    "wireframe",
    "black",
    "luxury",
    "dracula",
    "cmyk",
    "autumn",
    "business",
    "acid",
    "lemonade",
    "coffee",
    "winter",
    "dim",
    "nord",
    "sunset",
   "valentine",
    "abyss",
    "silk"
  ];

  const handleAddLink = async () => {
    if (!isValidURL(link)) {
      toast.error("Veuillez entrer une url valide ");
      return;
    }

    if (!socialPseudo) {
      toast.error("Veuillez entrer un pseudo");
      return;
    }

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

    try {
      // Ajouter la description lors de la création du lien
      const newLink = await addSocialLink(email, title, link, socialPseudo, socialDescription);
      const modal = document.getElementById("social_links_form") as HTMLDialogElement;
      if (modal) modal.close();

      if (newLink) {
        setLinks([...links, newLink]);
      }

      // Réinitialiser tous les champs
      setLink("");
      setSocialPseudo("");
      setSocialDescription(""); // Réinitialiser la description
      setTitle(socialLinksData[0].name);
      toast.success("Lien ajouté avec succès 🥳 ");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'ajout du lien");
    }
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

      const fetcheLinks = await getSocialLinks(email);
      if (fetcheLinks) {
        setLinks(fetcheLinks);
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
                 rounded-full bg-gradient-to-r from-orange-500 to-red-500
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

          <button
            className="btn btn-sm w-full my-4"
            onClick={() =>
              (document.getElementById("social_links_form") as HTMLDialogElement).showModal()
            }
          >
            <Plus className="w-4 h-4" />
          </button>

          <dialog id="social_links_form" className="modal">
            <div className="modal-box">
              <form method="dialog">
                <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                  ✕
                </button>
              </form>

              <h3 className="font-bold text-lg">Nouveau lien</h3>
              <p className="py-4">Ajouter vos liens publics</p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    className="select select-bordered w-full"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  >
                    {socialLinksData.map(({ name }) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Entrez le pseudo social"
                    className="input input-bordered w-full"
                    value={socialPseudo}
                    onChange={e => setSocialPseudo(e.target.value)}
                  />
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
                    value={socialDescription}
                    onChange={e => setSocialDescription(e.target.value)}
                    rows={4}
                  />
                  <label className="label">
                    <span className="label-text-alt">
                      Vous pouvez inclure des URLs qui seront converties en liens cliquables
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="text"
                    placeholder="Entrez l'URL"
                    className="input input-bordered w-full"
                    value={link}
                    onChange={e => setLink(e.target.value)}
                  />

                  <button className="btn btn-accent w-full" onClick={handleAddLink}>
                    Ajouter le lien
                  </button>
                </div>
              </div>
            </div>
          </dialog>

          {loading ? (
            <div className="my-10 flex justify-center items-center w-full">
              <span className="loading loading-spinner loading-lg text-accent"></span>
            </div>
          ) : links.length === 0 ? (
            <div className="flex justify-center items-center w-full">
              <EmptyState IconComponent={"Cable"} message={"Aucun lien disponible !😭"} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {links.map(link => (
                <LinkComponent
                  key={link.id}
                  socialLink={link}
                  onRemove={handleRemoveLink}
                  readonly={false}
                  fetchLinks={fetchLinks}
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
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
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
                theme={theme}
              />
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
}