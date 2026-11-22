import { useEffect, useState } from 'react'
import type { LatLngBounds, Map as LeafletMap } from 'leaflet'

// Returns the part of the world the map is currently showing, and updates
// it every time the user pans or zooms. Used to draw only the cows that are
// on screen: 3,000 cow images at once would make the map slow.
//
// A function whose name starts with "use" and that calls other hooks
// (useState, useEffect) is a "custom hook": reusable component logic.
export function useMapBounds(map: LeafletMap | null): LatLngBounds | null {
  const [bounds, setBounds] = useState<LatLngBounds | null>(null)

  useEffect(() => {
    if (!map) return
    // pad(0.2) = a little extra around the edges, so cows are already
    // there when you start dragging the map.
    const update = () => setBounds(map.getBounds().pad(0.2))
    update()
    map.on('moveend', update) // fires after every pan and zoom
    return () => {
      map.off('moveend', update) // clean up when the map goes away
    }
  }, [map])

  return bounds
}
