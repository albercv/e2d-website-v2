"use client"

import Script from "next/script"

declare global {
  interface Window {
    trackingFunctions: {
      onLoad: (opts: { appId: string }) => void
    }
  }
}

export function ApolloTracker() {
  return (
    <Script id="apollo-tracker" strategy="afterInteractive">{`
      (function(){
        var n=Math.random().toString(36).substring(7),o=document.createElement("script");
        o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n;
        o.async=true;o.defer=true;
        o.onload=function(){window.trackingFunctions.onLoad({appId:"6a04409482614e0019067475"})};
        document.head.appendChild(o);
      })();
    `}</Script>
  )
}
