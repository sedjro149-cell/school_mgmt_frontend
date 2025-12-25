// src/hooks/usePreventTranslate.js
import { useEffect } from "react";

/**
 * Empêche autant que possible la traduction automatique :
 * - met lang="fr", translate="no" et .notranslate sur <html> et #root
 * - utile dans une SPA pour ré-appliquer à chaque navigation
 */
export default function usePreventTranslate(deps = []) {
  useEffect(() => {
    try {
      // <html>
      const html = document.documentElement;
      if (html) {
        html.lang = "fr";
        html.setAttribute("translate", "no");
        html.classList.add("notranslate");
      }

      // #root (React)
      const root = document.getElementById("root");
      if (root) {
        root.setAttribute("translate", "no");
        root.classList.add("notranslate");
      }

      // on peut aussi parcourir les éléments ayant l'attribut lang et s'assurer qu'ils ont translate="no"
      document.querySelectorAll("[lang]").forEach((el) => {
        el.setAttribute("translate", "no");
      });
    } catch (e) {
      // silencieux : on ne veut pas casser l'app si le DOM est différent
      // mais on logge quand même en dev
      if (process.env.NODE_ENV === "development") console.warn("usePreventTranslate:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
