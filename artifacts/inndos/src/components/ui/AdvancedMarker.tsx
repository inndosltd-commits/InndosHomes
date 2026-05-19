import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGoogleMap } from "@react-google-maps/api";

interface AdvancedMarkerProps {
  position: google.maps.LatLngLiteral;
  children?: React.ReactNode;
  onClick?: () => void;
  draggable?: boolean;
  onDragEnd?: (e: google.maps.MapMouseEvent) => void;
}

export function AdvancedMarker({
  position,
  children,
  onClick,
  draggable,
  onDragEnd,
}: AdvancedMarkerProps) {
  const map = useGoogleMap();
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Create the container synchronously so the portal has a target on first render.
  const [container] = useState<HTMLDivElement>(() => document.createElement("div"));

  // Track whether the native marker has been placed on the map.
  const [markerReady, setMarkerReady] = useState(false);

  // Create / destroy the AdvancedMarkerElement when the map becomes available.
  useEffect(() => {
    if (!map || !google.maps.marker?.AdvancedMarkerElement) return;

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      content: children != null ? container : undefined,
      gmpDraggable: draggable ?? false,
    });
    markerRef.current = marker;
    setMarkerReady(true);

    return () => {
      marker.map = null;
      markerRef.current = null;
      setMarkerReady(false);
    };
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep position in sync without recreating the marker.
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.position = position;
    }
  }, [position.lat, position.lng]);

  // Keep draggable in sync.
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.gmpDraggable = draggable ?? false;
    }
  }, [draggable]);

  // Attach click listener — separate effect so it re-binds when onClick changes.
  useEffect(() => {
    if (!markerReady || !markerRef.current || !onClick) return;
    const listener = markerRef.current.addListener("click", onClick);
    return () => listener.remove();
  }, [markerReady, onClick]);

  // Attach dragend listener — separate effect so it re-binds when onDragEnd changes.
  useEffect(() => {
    if (!markerReady || !markerRef.current || !onDragEnd) return;
    const listener = markerRef.current.addListener(
      "dragend",
      (e: google.maps.MapMouseEvent) => onDragEnd(e)
    );
    return () => listener.remove();
  }, [markerReady, onDragEnd]);

  if (!markerReady || children == null) return null;
  return createPortal(children, container);
}
