"use client"

import { useState, useEffect } from "react"

const nbdPhrases = [
 "no big deal",
"nice bird dance",
"never been down",
"new beat drops",
"nothing but dreams",
"next big discovery",
"now begins dreams",
"not bad dude",
"no broken drums",
"nothing but dust",
"nobody builds dreams",
"null beyond design",
"necessary binary drift",
"negative balance disorder",
"neutral boundary domain",
"networked behavior drift",
"nested boundary dynamics",
"nomadic binary directions",
"natural breakdown device",
"nebula before dawn",
"night becomes darker",
"numb between dimensions",
"no bright destiny",
"nightbound dreamscape",
"night’s bleak divide",
"null between days",
"nocturnal breach detected",
"never beyond darkness",
"normalized business directive",
"non-binding document",
"network bureau division",
"negotiated baseline deviation",
"nominal budget deficit",
"nullified business decision",
"non-backed development",
"national bureau of drift",
"noncompliant behavior detected",
"normalized bureaucratic delay",
"nothing but daydreams",
"nice balanced day",
"nothing but delight",
"no better destination",
"now breathe deep",
"no boundaries defined",
"nihil becomes doctrine",
"nothing begets death",
"nightmare breach detonation",
"nerve-burning descent",
"no benevolent design",
"nothing but decay",
"nether breach domain",
"naked bleak dimension",
"null body detected",
"network buffer drain",
"node-based distribution",
"neural backprop drift",
"next byte delivered",
"non-binary data",
"nested block diagram",
"network bridge device",
"null bandwidth drop",
"numeric base decoder",
"nano bot deployment",
"nova burst detector",
"neutron beam disruptor",
"nanite breach defense",
"neural boundary detector",
"nano breach drone",
"nuclear boundary division",
"null biometric data",
"neuro-biological drift",
"nonlinear bubble dynamics",
"nomad biotech division",
"nothing becomes defined",
"no bound destiny",
"not being determined",
"nothing but doubt",
"never before defined",
"nominal belief drift",
"not believing destiny",
"necessary but destructive",
"normal becomes different",
"now becoming dust",
"nachos before dinner",
"no boring details",
"naps between deadlines",
"never bring drama",
"nobody buys donuts",
"not before dessert",
"new brain download",
"ninja battle dance",
"nothing but disco",
"nomad backpack dream",
"night between dawns",
"new bones dreaming",
"nowhere but downriver",
"northern breeze descends",
"naked branches dripping",
"nothing but distance",
"no breath drawn",
"numb beneath dawnlight",
"narrow bridges disappearing",
"no beginning done"
]

export default function Footer() {
  const [currentPhrase, setCurrentPhrase] = useState("no big deal")

  useEffect(() => {
    // Pick a random phrase on component mount (page load)
    const randomIndex = Math.floor(Math.random() * nbdPhrases.length)
    setCurrentPhrase(nbdPhrases[randomIndex])
  }, [])

  return (
    <footer style={{ 
      marginTop: '10px', 
      paddingTop: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '0 20px',
        textAlign: 'left',
        fontSize: '14px',
        color: '#666'
      }}>
        <p>{currentPhrase}.</p>
      </div>
    </footer>
  )
}
