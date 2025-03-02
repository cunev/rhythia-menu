import { Box } from "@chakra-ui/react";
import React, { useEffect, useRef } from "react";
import p5 from "p5";

interface P5CanvasProps {
  sketchFunction: (p: p5) => void;
}

const P5Canvas: React.FC<P5CanvasProps> = ({ sketchFunction }) => {
  const p5ContainerRef = useRef<HTMLDivElement>(null);
  const sketchInstance = useRef<p5 | null>(null);

  useEffect(() => {
    // Only create a new p5 instance if one doesn't already exist
    if (p5ContainerRef.current && !sketchInstance.current) {
      sketchInstance.current = new p5(sketchFunction, p5ContainerRef.current);
    }

    // Cleanup function to remove the p5 instance when component unmounts
    return () => {
      if (sketchInstance.current) {
        sketchInstance.current.remove();
        sketchInstance.current = null;
      }
    };
  }, [sketchFunction]);

  return <Box ref={p5ContainerRef} width="100%" height="100%" />;
};

export default P5Canvas;
