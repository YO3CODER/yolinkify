// Fichier JSON des liens sociaux corrigé + vidéos + liens quelconques

import { GraduationCap, Brain, Link, Video } from "lucide-react";

const socialLinksData = [
  // 🌍 Réseaux sociaux
  { name: "YouTube", root: "https://www.youtube.com/", altRoot: "https://youtu.be/", type: "video" },
  { name: "Facebook", root: "https://www.facebook.com/", altRoot: "https://facebook.com/", type: "social" },
  { name: "Twitter", root: "https://twitter.com/", altRoot: "https://x.com/", type: "social" },
  { name: "Instagram", root: "https://www.instagram.com/", altRoot: "https://instagram.com/", type: "video" },
  { name: "LinkedIn", root: "https://www.linkedin.com/", altRoot: "https://linkedin.com/", type: "social" },
  { name: "Pinterest", root: "https://www.pinterest.com/", altRoot: "https://pinterest.com/", type: "social" },
  { name: "Snapchat", root: "https://www.snapchat.com/", altRoot: "https://snapchat.com/", type: "social" },
  { name: "TikTok", root: "https://www.tiktok.com/", altRoot: "https://tiktok.com/", type: "video" },
  { name: "Reddit", root: "https://www.reddit.com/", altRoot: "https://reddit.com/", type: "social" },
  { name: "Twitch", root: "https://www.twitch.tv/", altRoot: "https://twitch.tv/", type: "video" },
  { name: "Discord", root: "https://discord.com/", altRoot: "https://discord.com/invite/", type: "social" },
  { name: "WhatsApp", root: "https://www.whatsapp.com/", altRoot: "https://chat.whatsapp.com/", type: "social" },
  { name: "Telegram", root: "https://t.me/", altRoot: "https://telegram.me/", type: "social" },

  // 💻 Dev & Créa
  { name: "GitHub", root: "https://github.com/", altRoot: "", type: "portfolio" },
  { name: "GitLab", root: "https://gitlab.com/", altRoot: "", type: "portfolio" },
  { name: "Dribbble", root: "https://dribbble.com/", altRoot: "", type: "portfolio" },
  { name: "Behance", root: "https://www.behance.net/", altRoot: "https://behance.net/", type: "portfolio" },
  { name: "Medium", root: "https://medium.com/", altRoot: "", type: "article" },
  { name: "Figma", root: "https://www.figma.com/", altRoot: "", type: "design" },
  { name: "CodePen", root: "https://codepen.io/", altRoot: "", type: "code" },

  // 🎵 Audio & Vidéo
  { name: "Spotify", root: "https://open.spotify.com/", altRoot: "", type: "audio" },
  { name: "SoundCloud", root: "https://soundcloud.com/", altRoot: "", type: "audio" },
  { name: "Deezer", root: "https://www.deezer.com/", altRoot: "", type: "audio" },
  { name: "Vimeo", root: "https://vimeo.com/", altRoot: "", type: "video" },

  // 🎓 Plateformes éducatives
  {
    name: "OpenClassrooms",
    root: "https://openclassrooms.com/",
    altRoot: "https://www.openclassrooms.com/",
    icon: GraduationCap,
    type: "education"
  },
  {
    name: "Schoolavox",
    root: "https://schoolavox.com/",
    altRoot: "https://www.schoolavox.com/",
    icon: GraduationCap,
    type: "education"
  },
  {
    name: "Udemy",
    root: "https://www.udemy.com/",
    altRoot: "",
    icon: GraduationCap,
    type: "education"
  },
  {
    name: "Khan Academy",
    root: "https://www.khanacademy.org/",
    altRoot: "",
    icon: Brain,
    type: "education"
  },

  // 📎 Fichiers
  { name: "PDF", root: "", altRoot: "", fileType: "pdf", icon: Link },
  { name: "Image", root: "", altRoot: "", fileType: "image", icon: Link },
  { name: "Vidéo", root: "", altRoot: "", fileType: "video", icon: Video },

  // 🔗 Liens quelconques (TRÈS IMPORTANT)
  {
    name: "Lien personnalisé",
    root: "",
    altRoot: "",
    type: "custom",
    icon: Link
  }
];

export default socialLinksData;
