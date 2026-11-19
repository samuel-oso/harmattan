import { GONE_MS, LANDED, LIFT_MS } from "@/lib/landing";

export const THEME_KEY = "harmattan:theme";

// runs before the page paints. a saved light theme never flashes dark first, and the start-up screen is put up
// on every full load of a page, unless motion is turned down. the screen is also timed from here, so that it lifts
// on time on a slow phone, where the rest of the script arrives late
export const restore = [
  `try{if(localStorage.getItem("${THEME_KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){document.documentElement.removeAttribute("data-theme")}`,
  `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches){var d=document.documentElement;d.dataset.boot="";setTimeout(function(){if(d.dataset.boot===""){d.dataset.boot="out";dispatchEvent(new Event("${LANDED}"))}},${LIFT_MS});setTimeout(function(){delete d.dataset.boot},${GONE_MS})}}catch(e){document.documentElement.removeAttribute("data-boot")}`,
].join(";");
