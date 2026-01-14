"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import Logo from "./Logo";
import { useUser } from "@clerk/nextjs";
import { checkAndAddUser } from "../server";

// Rendu strictement côté client pour éviter les erreurs d'hydration
const UserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  { ssr: false }
);

const Navbar = () => {
  const { user } = useUser();

  useEffect(() => {
    const init = async () => {
      if (user?.primaryEmailAddress?.emailAddress && user.fullName) {
        await checkAndAddUser(
          user.primaryEmailAddress.emailAddress,
          user.fullName
        );
      }
    };
    init();
  }, [user]);

  return (
    <div className="px-5 md:px-[10%] pt-4">
      <div className="flex justify-between items-center">
        <Logo />
        <div className="bg-transparent ml-auto">
          {/* Render UserButton uniquement côté client */}
          <UserButton />
        </div>
      </div>
    </div>
  );
};

export default Navbar;
