"use client";

import Link from "next/link";
import Wrapper from "./components/Wrapper";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { addSocialLink, getSocialLinks, getUserInfo, removeSocialLink, updateUserTheme } from "./server";
import { Copy, Palette, Plus } from "lucide-react";
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
      const newLink = await addSocialLink(email, title, link, socialPseudo);
      const modal = document.getElementById("social_links_form") as HTMLDialogElement;
      if (modal) modal.close();

      if (newLink) {
        setLinks([...links, newLink]);
      }

      setLink("");
      setSocialPseudo("");
      setTitle(socialLinksData[0].name);
      toast.success("Lien ajouter avec succès 🥳 ");
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    try {
      await removeSocialLink(email, linkId);
      setLinks(links.filter(link => link.id !== linkId));
      toast.success("Lien supprimé");
    } catch {
      console.error(error);
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

    const url = `yolinkify.versel.app/page/${pseudo}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Lien copié"))
      .catch(err => console.error("Erreur lors de la copie :", err));
  };

  const handleConfirmTheme = async () =>{
    try {

      if(theme){
         await updateUserTheme(email , theme)
        toast.success("Thème apliqué")
        setTheme2(theme)
      }
    
    }catch (error){
      console.error(error)
    }
  }

  return (
    <Wrapper>
      <Toaster position="top-right" reverseOrder={false} />

      <div className="flex flex-col md:flex-row">
        <div className="md:w-2/3">
          <div className="flex justify-between items-center bg-base-200 p-5 rounded-3xl">
            <div>
              <span>🔥 Ta page est prête 😎 </span>

              {pseudo && (
                <Link
                  href={`/page/${pseudo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link hidden md:flex font-bold"
                >
                  📄Page de : {pseudo}
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

              <h3 className="font-bold text-lg">Nouveau lien </h3>
              <p className="py-4">Ajouter vos liens publics </p>

              <div className="grid grid-cols-2 gap-2">
                <select
                  className="select select-bordered"
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

                <input
                  type="text"
                  placeholder="Entrez l'URL"
                  className="input input-bordered w-full"
                  value={link}
                  onChange={e => setLink(e.target.value)}
                />

                <button className="btn btn-accent" onClick={handleAddLink}>
                  Ajouter
                </button>
              </div>
            </div>
          </dialog>

          {loading ? (
            <div className="my-30 flex justify-center items-center w-full">
              <span className="loading loading-spinner loading-lg text-accent"></span>
            </div>
          ) : links.length === 0 ? (
            <div className="flex justify-normal items-center w-full">
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

        <div className="md:w-1/3 ml-4">
          {pseudo && theme && (
            <div>
              <div className="flex items-center mb-4">
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
    className={`ml-4 btn ${theme === theme2 ? 'btn-disabled' : 'btn-accent'} flex items-center justify-center`}
    
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